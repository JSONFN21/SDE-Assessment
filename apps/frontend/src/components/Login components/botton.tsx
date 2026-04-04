import {Button, CircularProgress, Stack} from "@mui/material";

type BottonProps = {
    loading: boolean;
    disabled?: boolean;
    label: string;
};

export default function Botton({
    loading,
    disabled,
    label,
}: BottonProps) {
    const isDisabled = loading || Boolean(disabled);
    return (
        <Button type="submit" fullWidth variant="contained" disabled={isDisabled}
            aria-busy={loading} aria-label={label} 
            sx={{ mt: 1.5, py: 1.1, textTransform: "none", fontWeight: 600 }}
    >
        { loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={18} color="inherit" />
                <span>Loading...</span>
            </Stack>
        ) : (
            label
        )}
    </Button>
    );
}
