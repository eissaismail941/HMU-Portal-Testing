HMU Academic Portal — PHASE 10 REAL TEST WEBSITE
================================================

WHAT YOU HAVE
- index.html            Premium, responsive homepage with student and admin entrances.
- student.html          Real Phase 8 student login, activation, stage, group and private Phase 9 R2 PDFs.
- admin.html            Existing working Phase 8 admin functions and Phase 6 R2 upload/library.
- site.css              Homepage design.
- student.css/js        Original working Phase 9 student page code separated into assets.
- admin.css/js          Original working Phase 8 admin page code separated into assets.
- portal-overrides.css  Small navigation additions linking back to the new homepage.

CRITICAL: THIS IS A TEST ENVIRONMENT
- Site files are separate from your current MedHub repository and original index.html.
- It REUSES existing TEST Workers, Supabase project Auth, pilot table and R2 PRIVATE sandbox bucket.
- That means changing test accounts or test R2 files affects those existing pilot services.
- Only two controlled test student accounts are supported. Do not use real HMU student credentials or upload an actual student roster.
- This is an independent prototype, not an officially deployed HMU service.
- You do not need to create, rotate, or expose any Supabase keys. Publishable key alone appears in browser JS.

BEST DEPLOYMENT: A NEW GITHUB REPOSITORY
1. In GitHub create a NEW PUBLIC repo named HMU-Portal-Testing.
2. Upload ALL 10 files from this extracted folder to the ROOT of that NEW repo.
   Do not upload the ZIP by itself; GitHub Pages needs the actual HTML/CSS/JS files.
3. In repo Settings → Pages, choose Deploy from a branch → main → /(root), Save.
4. Open https://eissaismail941.github.io/HMU-Portal-Testing/
5. Student: use one of the existing two PILOT accounts. Admin: use the existing real Super Admin pilot account.
6. Keep the existing MedHub repository, index.html, admin files, PDF endpoints, and old test Workers unchanged.

WHY THE NEW REPO WORKS
Both GitHub Pages repositories are served under the SAME hostname: https://eissaismail941.github.io
The test Workers' allowed Origin remains the same, so a different repository path does not require Worker CORS changes.

DO NOT HOST THE FILES ON A DIFFERENT DOMAIN without first reviewing Worker origin restrictions.
Local file:// URLs can preview the homepage but cannot securely log in to the Worker APIs (different origin).

TEST CHECKS
[ ] Homepage loads and navigation works
[ ] Stage 1 account displays Stage 1 only
[ ] Stage 2 account displays Stage 2 private PDFs
[ ] Open PDF works from private sandbox R2
[ ] Student disables and cannot access PDFs
[ ] Student enables and access returns
[ ] Super Admin academic library upload and directory still work

PRODUCTION LIMITATIONS
- Student ID as initial password is only used for controlled pilot. Production requires verified identities, secure initial credentials, anti-abuse controls and account recovery.
- Pilot is limited to College of Medicine and two test students.
- Existing Phase 8 admin and Phase 9 student features are reused, not fully redesigned.
- Full security audit, load testing, and private-file policy review are needed for rollout.
- Same Supabase and R2 sandbox services as earlier pilots. Front-end files alone are isolated.
