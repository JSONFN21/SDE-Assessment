import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Team, TeamMember, TeamRole } from '../../services/teamsApi';

type Props = {
  open: boolean;
  teams: Team[];
  members: TeamMember[];
  selectedTeamId: string | null;
  onClose: () => void;
  onSelectTeam: (teamId: string | null) => void;
  onCreateTeam: (input: { name: string; description?: string }) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onAddMember: (teamId: string, input: { username: string; role: TeamRole }) => Promise<void>;
  onUpdateMemberRole: (teamId: string, memberId: string, role: TeamRole) => Promise<void>;
  onRemoveMember: (teamId: string, memberId: string) => Promise<void>;
};

const ROLES: TeamRole[] = ['OWNER', 'MEMBER', 'VIEWER'];

export default function TeamManagerDialog({
  open,
  teams,
  members,
  selectedTeamId,
  onClose,
  onSelectTeam,
  onCreateTeam,
  onDeleteTeam,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}: Props) {
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [memberRole, setMemberRole] = useState<TeamRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTeamName('');
      setTeamDescription('');
      setMemberUsername('');
      setMemberRole('MEMBER');
      setError(null);
    }
  }, [open]);

  const selectedTeam = useMemo(
    () => teams.find(team => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const canManageSelectedTeam = selectedTeam?.role === 'OWNER';

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    try {
      await onCreateTeam({ name: teamName.trim(), description: teamDescription.trim() || undefined });
      setTeamName('');
      setTeamDescription('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam) return;
    if (!memberUsername.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    try {
      await onAddMember(selectedTeam.id, { username: memberUsername.trim(), role: memberRole });
      setMemberUsername('');
      setMemberRole('MEMBER');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={700} fontSize={20}>Teams</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box>
            <Typography fontWeight={700} mb={1}>Create Team</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Team Name"
                value={teamName}
                onChange={event => setTeamName(event.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Description"
                value={teamDescription}
                onChange={event => setTeamDescription(event.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button variant="contained" onClick={handleCreateTeam} disabled={loading}>Create</Button>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography fontWeight={700} mb={1}>Your Teams</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label="Personal Board"
                color={selectedTeamId === null ? 'primary' : 'default'}
                variant={selectedTeamId === null ? 'filled' : 'outlined'}
                onClick={() => onSelectTeam(null)}
              />
              {teams.map(team => (
                <Chip
                  key={team.id}
                  label={`${team.name} (${team.role.toLowerCase()})`}
                  color={selectedTeamId === team.id ? 'primary' : 'default'}
                  variant={selectedTeamId === team.id ? 'filled' : 'outlined'}
                  onClick={() => onSelectTeam(team.id)}
                />
              ))}
            </Stack>
          </Box>

          {selectedTeam && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Box>
                  <Typography fontWeight={700}>{selectedTeam.name}</Typography>
                  {selectedTeam.description && (
                    <Typography variant="body2" color="text.secondary">{selectedTeam.description}</Typography>
                  )}
                </Box>
                {canManageSelectedTeam && (
                  <Button color="error" onClick={() => onDeleteTeam(selectedTeam.id)}>
                    Delete Team
                  </Button>
                )}
              </Stack>

              <Typography variant="body2" color="text.secondary" mb={1}>
                Members: {selectedTeam.memberCount} | Tasks: {selectedTeam.taskCount}
              </Typography>

              {canManageSelectedTeam && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
                  <TextField
                    label="Username"
                    value={memberUsername}
                    onChange={event => setMemberUsername(event.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    select
                    label="Role"
                    value={memberRole}
                    onChange={event => setMemberRole(event.target.value as TeamRole)}
                    size="small"
                    sx={{ width: 140 }}
                  >
                    {ROLES.filter(role => role !== 'OWNER').map(role => (
                      <MenuItem key={role} value={role}>{role.toLowerCase()}</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="outlined" onClick={handleAddMember} disabled={loading}>Add Member</Button>
                </Stack>
              )}

              <List disablePadding>
                {members.map(member => (
                  <ListItem
                    key={member.id}
                    sx={{
                      px: 0,
                      py: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{member.user.username}</Typography>
                      <Typography variant="body2" color="text.secondary">{member.user.email}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      {canManageSelectedTeam && member.role !== 'OWNER' ? (
                        <TextField
                          select
                          size="small"
                          value={member.role}
                          onChange={event => onUpdateMemberRole(selectedTeam.id, member.id, event.target.value as TeamRole)}
                          sx={{ minWidth: 120 }}
                        >
                          {ROLES.filter(role => role !== 'OWNER').map(role => (
                            <MenuItem key={role} value={role}>{role.toLowerCase()}</MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Chip label={member.role.toLowerCase()} size="small" variant="outlined" />
                      )}
                      {canManageSelectedTeam && member.role !== 'OWNER' && (
                        <Button color="error" onClick={() => onRemoveMember(selectedTeam.id, member.id)}>Remove</Button>
                      )}
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
