# Windows Task Scheduler Template (Read-Only Boot)

This folder contains a Task Scheduler XML template intended to register a boot-time task.

## Intent

- Run at boot.
- Use read-only / offline posture.
- Do not enable automations.

This is a template; it does not assert how SintraPrime behaves.

## Files

- `SintraPrime.ReadOnlyAtBoot.v1.0.0.xml`

## Configuration

- Replace placeholder paths under `<Command>` and `<Arguments>`.
- Keep the task action non-interactive.
- Do not add network enablement here.
