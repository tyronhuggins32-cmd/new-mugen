# Optional Thorfinn animation expansion

The original character remains selectable with its two committed atlases: 56 movement frames in `thorfinn-atlas-v3.webp` and 36 combat frames in `thorfinn-combat-v4.webp`.

To install the newly created **13-sheet expanded sprite pack**, copy the contents of the separately supplied `thorfinn_complete_for_github.zip` to `characters/thorfinn/animation-pack/` in this repository, preserving filenames. The ZIP contains `animation-pack.json` and 13 transparent WebP atlases, each using 384×384 fixed cells. All animation sets are named and mapped in its manifest. The browser picks those images automatically after they have been uploaded. Missing images safely fall back to the already committed character art without disabling Thorfinn.

The pack adds or replaces idle, walk, run, crouch, crouch-walk, jump, landing, guarding, dodge, light attack, heavy attack, special spinning slash, aerial attack, air combo, stagger, knockback and knockdown poses. The existing five authored source combat sheets and portrait remain preserved.

**Gameplay fixes:** a backward dash selects the dodge animation; landing plays a distinct landing state; light/heavy hit reactions are differentiated, and a launched heavy-hit Thorfinn transitions to knockdown on ground contact. Yusuke's behavior and input bindings are unchanged.

**Asset QA note:** Generated source sheets are prototypes. Check transparency fringes, foot alignment, stroke continuity, hurtboxes and the transitions in actual gameplay before calling the character final. Run `node tests/thorfinn-extra-pack.cjs` for source integration checks, then use the browser smoke test for actual rendering when the WebP atlas files have been uploaded.
