# StudyVault

A responsive school-file vault built with Next.js and Supabase. Users can create an account, sign in, upload files, search their files, download them, delete them, and switch between light and dark themes.

## What you need

- A GitHub account
- A Vercel account
- A Supabase account
- Node.js LTS installed on your computer

## 1. Create the Supabase backend

1. Open https://supabase.com and create a project.
2. Save the database password somewhere safe. This app does not need that password in its code.
3. When the project is ready, open **Project Settings → API** (or **Connect**) and copy:
   - Project URL
   - `anon` / publishable public key
4. In Supabase, open **SQL Editor → New query**.
5. Open `supabase-setup.sql` from this project, copy all of it into the SQL Editor, and click **Run**. This creates a private file bucket with per-user access rules.
6. Open **Authentication → URL Configuration**. For local testing, set the Site URL to `http://localhost:3000`. Add `http://localhost:3000/**` to Redirect URLs if your dashboard asks for it.
7. For the easiest first test, go to **Authentication → Providers → Email** and check the email-confirmation setting. If confirmation is enabled, users need to click the confirmation email before they can log in. For a real class deployment, keep email confirmation enabled and configure your email provider properly.

## 2. Run it on your Windows laptop

1. Install Node.js LTS from https://nodejs.org if it is not installed. Restart your terminal after installing.
2. Extract the ZIP file to a folder you can find, for example `Desktop\studyvault`.
3. Open the extracted folder.
4. Create a copy of `.env.local.example` named exactly `.env.local` (not `.env.local.txt`).
5. Open `.env.local` in Notepad and replace the example values with your Supabase Project URL and anon/publishable key. Save it.
6. Open Command Prompt or the terminal inside that folder.
7. Run these commands one at a time:

   ```bash
   npm install
   npm run dev
   ```

8. Open http://localhost:3000 in your browser.
9. Create an account, log in, and try uploading a small test file. Open the site in another browser/device only after you deploy it.

If a command says `npm` is not recognized, Node.js is not installed correctly or the terminal needs to be restarted.

## 3. Upload to GitHub

1. Create a **new, private repository** on GitHub if this is initially for you and your classmates.
2. Do not upload `.env.local`. It is ignored by `.gitignore`.
3. Upload the project files and folders to the repository. You can use GitHub's website upload feature for a small project, or use Git:

   ```bash
   git init
   git add .
   git commit -m "Create StudyVault"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git push -u origin main
   ```

   Replace `YOUR_GITHUB_REPOSITORY_URL` with your repository URL.

## 4. Deploy on Vercel

1. Open https://vercel.com and choose **Add New → Project**.
2. Import your GitHub repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon/publishable key
4. Click **Deploy** and wait for the build to finish.
5. Copy your Vercel website URL.
6. Return to Supabase → **Authentication → URL Configuration**:
   - Change **Site URL** to your Vercel URL, e.g. `https://your-project.vercel.app`
   - Add your Vercel URL and local URL to **Redirect URLs** if required.
7. Open the Vercel URL and test signup, login, upload, download, delete, and dark mode.

## Security notes

- The storage bucket is private; files are not public URLs.
- Row-level storage policies limit file access to the authenticated user's own folder.
- The public/anon key is intended for browser use. Never put a Supabase `service_role` key in this app or in Vercel's `NEXT_PUBLIC_` variables.
- Use a strong, unique password and log out on shared school computers.
- This starter limits each file to 50 MB. Supabase's project storage quota and plan limits still apply.
- This is a starter project, not a security audit. Before using it for sensitive school records, review the Supabase policies and your school's privacy requirements.
