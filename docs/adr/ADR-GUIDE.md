# Architecture Decision Records (ADRs) Guide

This guide explains how to create, review, and maintain Architecture Decision Records in Brain-Storm.

---

## What is an ADR?

An Architecture Decision Record (ADR) documents a significant technical decision made in the project. It captures:
- **What** was decided
- **Why** it was decided
- **When** it was decided
- **Who** made the decision
- **Consequences** of the decision

ADRs provide historical context and help future developers understand the reasoning behind architectural choices.

---

## When to Create an ADR

Create an ADR for decisions that:
- Affect multiple components or systems
- Have long-term implications
- Involve trade-offs between alternatives
- Represent a significant change in direction
- Are likely to be questioned or revisited

**Do NOT create ADRs for:**
- Minor implementation details
- Bug fixes
- Routine maintenance
- Local refactoring

---

## ADR Template

Use the template in `ADR-TEMPLATE.md`. Key sections:

### Status
- **Proposed:** Under discussion, not yet decided
- **Accepted:** Decision made and approved
- **Deprecated:** No longer applicable
- **Superseded:** Replaced by a newer ADR

### Context
Explain the problem or situation. Include:
- Background and history
- Current constraints
- Why a decision is needed
- Stakeholders affected

### Decision
State the choice clearly and concisely. Be specific.

### Rationale
Explain the reasoning:
- Why this option was chosen
- Alternatives considered
- Trade-offs accepted
- Alignment with project goals

### Consequences
Describe outcomes:
- **Positive:** Benefits and improvements
- **Negative:** Trade-offs and costs
- **Neutral:** Side effects

### Implementation Notes
Provide practical guidance:
- Affected files/modules
- Migration steps
- Timeline
- Rollback strategy

### References
Link to related resources:
- GitHub issues
- External documentation
- Related ADRs

---

## Creating a New ADR

### Step 1: Identify the Decision

Discuss with the team. Is this significant enough for an ADR?

### Step 2: Copy the Template

```bash
cp docs/adr/ADR-TEMPLATE.md docs/adr/ADR-NNN-your-decision.md
```

Replace `NNN` with the next sequential number.

### Step 3: Fill in All Sections

- Use clear, concise language
- Include concrete examples
- Explain trade-offs honestly
- Link to relevant resources

### Step 4: Create a Pull Request

- Title: `docs(adr): ADR-NNN - Your Decision Title`
- Description: Link to related issues/discussions
- Request review from architecture team

### Step 5: Review & Approval

- Team discusses the decision
- Feedback incorporated
- Status changed to "Accepted"
- Merged to main

### Step 6: Update the Index

Add entry to `README.md`:

```markdown
| [ADR-NNN](./ADR-NNN-your-decision.md) | Your Decision Title | Accepted |
```

---

## ADR Review Checklist

When reviewing an ADR, verify:

- [ ] Status is appropriate (Proposed vs Accepted)
- [ ] Context clearly explains the problem
- [ ] Decision is specific and unambiguous
- [ ] Rationale includes alternatives considered
- [ ] Consequences are realistic and honest
- [ ] Implementation notes are practical
- [ ] References are accurate and helpful
- [ ] Writing is clear and concise
- [ ] No spelling or grammar errors

---

## ADR Versioning

### When to Update an ADR

- **Minor clarifications:** Update directly
- **Status change:** Update status and add revision entry
- **Superseded:** Create new ADR, mark old as "Superseded"

### Revision History

Track changes in the Revision History table:

```markdown
| Date | Author | Change |
|------|--------|--------|
| 2024-01-15 | Alice | Initial proposal |
| 2024-01-20 | Bob | Clarified implementation notes |
| 2024-02-01 | Alice | Marked as Accepted |
```

---

## ADR Examples

### Good ADR

✅ **Clear decision:** "Use Stellar/Soroban for blockchain integration"
✅ **Specific rationale:** Explains why Stellar over Ethereum
✅ **Honest trade-offs:** Acknowledges limitations
✅ **Implementation guidance:** Links to contract code
✅ **References:** Links to Stellar docs and related ADRs

### Poor ADR

❌ **Vague decision:** "Improve performance"
❌ **Missing alternatives:** Doesn't explain other options
❌ **No consequences:** Doesn't discuss trade-offs
❌ **No implementation:** Doesn't guide developers
❌ **No references:** Isolated from context

---

## Current ADRs

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](./ADR-001-stellar-soroban-over-ethereum.md) | Use Stellar/Soroban over Ethereum | Accepted |
| [ADR-002](./ADR-002-nestjs-over-express.md) | Use NestJS over Express | Accepted |
| [ADR-003](./ADR-003-nextjs-app-router.md) | Use Next.js App Router | Accepted |
| [ADR-004](./ADR-004-soroban-persistent-storage-credentials.md) | Use Soroban Persistent Storage for Credentials | Accepted |
| [ADR-005](./ADR-005-token-economics.md) | Brain-Storm Token (BST) Economics | Accepted |

---

## Best Practices

### Writing

- Use active voice
- Be concise but thorough
- Avoid jargon or explain it
- Use examples and diagrams
- Link to code when relevant

### Decision Making

- Involve stakeholders early
- Document alternatives considered
- Be honest about trade-offs
- Get team consensus before "Accepted"
- Revisit decisions periodically

### Maintenance

- Keep ADRs up-to-date
- Link related ADRs
- Archive superseded decisions
- Use consistent formatting
- Review during onboarding

---

## Resources

- [ADR GitHub Organization](https://adr.github.io/)
- [MADR Format](https://adr.github.io/madr/)
- [ADR Examples](https://github.com/joelparkerhenderson/architecture_decision_record)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

---

## Questions?

- Open an issue in GitHub
- Ask in the #architecture channel on Discord
- Review existing ADRs for examples
