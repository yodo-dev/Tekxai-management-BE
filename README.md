# Tekxai Management BE

A modular monolith backend scaffold built with Node.js and Express.js.

## Structure

```text
src/
├── app.js
├── server.js
├── config/
├── routes/
├── shared/
└── modules/
    ├── auth/
    ├── users/
    └── admin/
```

## Notes

- Business logic should stay inside the owning module.
- Shared code should only live under `src/shared` when multiple modules actually use it.
- `src/app.js` is the Express app entrypoint.
- `src/server.js` is the startup file.

## Status

This repository currently contains the folder structure only. Implementation will be added module by module.
