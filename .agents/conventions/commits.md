# Commit Conventions

All commits must follow the Conventional Commits specification v1.0.0.

Format:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Allowed types:
- `feat` - a new feature
- `fix` - a bug fix
- `docs` - documentation changes only
- `style` - formatting, missing semicolons, etc; no logic change
- `refactor` - code change that is neither a fix nor a feature
- `test` - adding or updating tests
- `chore` - build process, tooling, dependency updates
- `ci` - CI/CD configuration changes
- `perf` - performance improvements
- `revert` - reverting a previous commit

Rules:
- Use lowercase for the type and description
- Keep the description short and in the imperative mood ("add feature" not "added feature")
- Do not end the description with a period
- Add a body when the change needs more context
- Reference issues or PRs in the footer when relevant

After making a commit, ask whether I would like to push the changes to the upstream branch.