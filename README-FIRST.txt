HMU ACADEMIC PORTAL - PHASE 11 STUDENT DESIGN TEST

This uses the user's uploaded HMU-Student-Portal-Keyboard-Fixed.html as the visual reference:
minimalist academic layout, soft neutral background, modern typographic hierarchy,
compact campus/academic identity, simple content cards, calm transitions, and clean footer.
It is a new student-page design, not a replacement of the original source file.

IMPORTANT: DO NOT CHANGE YOUR EXISTING MEDHUB REPOSITORY.

UPLOAD ONLY THESE THREE NEW FILES to the ROOT of the existing SEPARATE
HMU-Portal-Testing GitHub repository:
  1. student-design-test.html
  2. student-design-test.css
  3. student-design-test.js

The new page REUSES the ALREADY WORKING student.js file from Phase 10,
which must remain in the repository root. Do not replace that JS file.
The new page also reuses the existing Cloudflare Phase 8 and Phase 9 test Workers.

TEST URL (after upload):
https://eissaismail941.github.io/HMU-Portal-Testing/student-design-test.html

The original 'student.html' and 'index.html' are not modified.
Your real MedHub production site is not modified.
Only TWO controlled Supabase test student accounts are supported.
The page is NOT ready for public university deployment.

NOTES:
- Login, activation, refresh-token handling, account disabling, password changes,
  and private PDF listing/download are all implemented in the existing student.js.
- Because that JS controls security-sensitive operations, do NOT duplicate a new auth
  implementation in the visual design scripts.
- Never put the Supabase secret key in HTML/CSS/JS or screenshots.
- If the page is blank, verify that 'student.js' is also in the GitHub repository ROOT.
