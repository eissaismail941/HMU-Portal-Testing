HMU Phase 11 — EXACT ORIGINAL STYLE test
================================================
This test is based on the HTML supplied by the user: HMU-Student-Portal-Keyboard-Fixed.html.
It reuses its actual CSS, original login, college, stage, block, subject, PDF-card and footer markup.
It DOES NOT import the source's old JavaScript, admin.js, Google Analytics, public PDF URLs, or production lectures.

Upload these FOUR files to the ROOT of your SEPARATE repository HMU-Portal-Testing:
  student-exact-test.html
  student-exact.css
  student-exact.js
  hmu-reference-logo.png

DO NOT REPLACE index.html, admin.html, student.html, CSS/JS used by those pages, or any old HTML.
Do not modify your production MedHub repository.

TEST URL (once uploaded):
https://eissaismail941.github.io/HMU-Portal-Testing/student-exact-test.html

What to test:
1. Sign in with a Phase 8 pilot student email and CURRENT password.
2. Verify the ORIGINAL HMU COLLEGE PAGE DESIGN and the assigned Medicine college.
3. Continue; Stage 1 or 2 is selected from your authenticated profile. Other stages are not available.
4. Continue to blocks, choose one, then subject, then a private Phase 6 test PDF.
5. Open/download. These calls go through the Phase 9 Worker with the student's JWT.
6. Log out via the existing original-style menu or footer.
7. Test with Stage 1 and Stage 2 accounts; other-stage direct PDF authorization is enforced by the Phase 9 backend.

TECHNICAL SAFETY:
- No Supabase SECRET is included. Only the browser-safe publishable key.
- Supabase Auth + Phase 8 student profile API; Phase 9 private R2 Worker.
- Students cannot self-assign stages or choose college for authorization.
- This intentionally uses your two existing TEST accounts, not real student rosters.
- The Phase 9 Worker currently returns one Stage 1 grouping (not original Block 1/Block 2): the test shows what the authenticated backend supports.
- Some source HTML styles are fully preserved. Content shown may differ because the protected pilot only has test PDFs.
- Original live MedHub site and code remain unchanged.
