# Item 1.1: Supabase Password Protection — Completion Checklist

**Status:** ✅ READY TO EXECUTE  
**Owner:** GitHub Copilot  
**Effort:** 1 hour  
**Access Required:** Supabase dashboard admin

---

## Step-by-Step Completion

### Step 1: Access Supabase Dashboard

1. Open browser: **https://app.supabase.com**
2. Log in with your account credentials
3. Select **CareSync HIMS** project from the project list

**Expected:** You see the project dashboard with menu on left side

---

### Step 2: Navigate to Authentication Settings

1. In left sidebar, click **Settings** (gear icon)
2. In submenu, click **Authentication**
3. Scroll down to **Security** section

**Expected:** You see various security toggles and options

---

### Step 3: Locate & Enable Password Leak Detection

**Look for:** One of these labels (varies by Supabase version):
- ✅ "Check password against Have I Been Pwned (HIBP)"
- ✅ "Prevent compromised passwords"  
- ✅ "Password leak detection"
- ✅ "HIBP password check"

**Action:**
- Find the toggle/checkbox next to this label
- If **OFF** (gray) → Click to enable (turn blue/green)
- If **ON** (blue/green) → Already enabled ✅

**Screenshot Reference:** The toggle should move from left (off) to right (on) position

---

### Step 4: Save Settings

1. Look for **Save** button at bottom of page
2. Some Supabase versions auto-save (no button needed)
3. Wait for success message: "✅ Settings updated successfully"

**Expected:** No error messages; success confirmation appears

---

### Step 5: Verify Enablement (Test)

#### Test 1: Known Compromised Password

1. Open **Incognito/Private browser window** (don't log out from main window)
2. Go to your app's sign-up page: `http://localhost:5173/signup` (or staging URL)
3. Try to create account with credentials:
   - Email: `testuser@example.com`
   - Password: `password123` (this is in HIBP)
4. Expected result: ❌ Error message like:
   ```
   "Password has been exposed in data breaches. 
    Please choose a different password."
   ```

#### Test 2: Strong Password (Should Work)

1. Same sign-up page
2. Try with:
   - Email: `testuser@example.com`
   - Password: `MySecure@Pass2026!` (strong, unique)
3. Expected result: ✅ Account creation succeeds OR validates properly

**Document Results:**
```
✅ HIBP Check Enabled
- Test 1 (leaked pwd): ✅ Blocked as expected
- Test 2 (strong pwd): ✅ Allowed as expected
- Timestamp: [CURRENT TIME]
```

---

### Step 6: Document Completion

Create a markdown comment in the issue/PR:

```markdown
## ✅ Item 1.1: Supabase Password Protection — COMPLETE

**Configuration:**
- ✅ HIBP Password leak detection: **ENABLED**
- ✅ Tested with compromised password: Correctly blocked
- ✅ Tested with strong password: Correctly allowed

**Timestamp:** April 18, 2026, [TIME]

**Evidence:**
- Supabase dashboard screenshot: [Screenshot of enabled toggle]
- Test results: [Paste test output]

**Status:** Ready for production
```

---

## Troubleshooting

### Issue: Can't Find the Toggle

**Solution:**
- Supabase may have renamed the setting in newer versions
- Search in page: Press `Ctrl+F` (Windows) or `Cmd+F` (Mac)
- Search for: "HIBP" or "compromise" or "leak" or "password"
- If not found → May be under **Auth** > **Auth Policies** in newer versions

### Issue: Toggle is Grayed Out

**Cause:** You may not have admin privileges  
**Solution:** 
- Ask account owner to enable it
- Or check team member permissions in Supabase Settings > Team

### Issue: Seeing Error During Save

**Solution:**
1. Refresh page: `Ctrl+R` (Windows) or `Cmd+R` (Mac)
2. Try enabling again
3. If persists → Contact Supabase support with screenshot

---

## Verification Checklist

- [ ] Logged into Supabase dashboard successfully
- [ ] Found "HIBP" / "Password leak" setting
- [ ] Toggle is now **ENABLED** (blue/green)
- [ ] Settings saved without errors
- [ ] Tested with compromised password → correctly rejected
- [ ] Tested with strong password → correctly accepted
- [ ] Documented completion in PR/issue comment

---

## Success Criteria

✅ **Item 1.1 is COMPLETE when:**
1. HIBP toggle is visibly **ON** in Supabase dashboard
2. At least 1 compromised password correctly rejected during test
3. At least 1 strong password correctly accepted during test
4. No errors in Supabase logs

---

## What This Protects

| Threat | Before | After |
|--------|--------|-------|
| User registers with leaked password | ❌ Allowed | ✅ Blocked |
| Attacker uses HaveIBeenPwned database | ❌ Access possible | ✅ Prevented |
| Credential reuse attacks | ❌ Undetected | ✅ Detected & blocked |

---

## Next: Tier 1 Item 1.3 (Soak Test)

Once this is complete → proceed to [TIER1_SOAK_TEST_SETUP.md](TIER1_SOAK_TEST_SETUP.md)

**Time estimate:** 1 hour to enable + 24 hours waiting for soak test results

---

**Completion Time:** Approximately 1 hour  
**Blocker Status:** No external dependencies  
**Ready to Execute:** ✅ YES
