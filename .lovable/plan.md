
## Skills Currently Installed vs. Available

Your project has **2 skills currently enabled** in `skills-lock.json`:

1. **`agent-tools`** (from tul-sh/skills)
   - Provides intelligent code navigation, refactoring, and debugging tools
   - Enhances the AI's ability to work with complex codebases

2. **`frontend-design`** (from anthropics/skills)
   - Creates distinctive, production-grade UI interfaces
   - Focuses on avoiding generic AI aesthetics and committing to bold design directions
   - Helps with typography, color themes, motion/animations, and spatial composition

## Additional Skills Available in Your Project

Beyond the locked skills, there's also a **code-review skill** configured (`.agents/skills/code-review/SKILL.md`):

3. **`code-review`**
   - Structured code review and issue finder for the CareSync HIMS app
   - Detects security vulnerabilities, HIPAA compliance issues, privilege escalation risks
   - Identifies performance bottlenecks, accessibility issues, and code quality debt
   - Produces comprehensive findings reports with severity ratings and remediation steps

## Recommendations for Your Healthcare App

Given that this is a **hospital/healthcare application**, you should consider:

- **Security & Compliance skill** (if available) — for HIPAA validation and PHI protection
- **Backend/Database skill** — for optimizing Supabase queries and RLS policies
- **Testing/QA skill** — for comprehensive test coverage and integration testing
- **Performance optimization skill** — for load testing and optimization

## How to Add New Skills

1. Check if a skill exists in public skill repositories (GitHub, etc.)
2. Add the skill reference to `skills-lock.json` with the source and hash
3. The next message will automatically use that skill

**Next step:** Would you like me to review the codebase using the code-review skill to identify issues, or do you want help with a specific enhancement?
