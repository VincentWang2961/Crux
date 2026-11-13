---
title: When the patch won't patch: November's Windows 11 update failures
date: 2026-11-14
summary: Microsoft's November security update stalled on some Windows 11 PCs that had taken October's optional preview. A short recap, and why preview updates don't belong on a production fleet.
---

This week Microsoft confirmed that its **November 2026 security update for Windows 11 (KB5132061)** was failing to install on some machines. It's a small incident with a familiar lesson, so here's a quick recap and my take from the service-desk side.

## What happened

From Microsoft's statement and [BleepingComputer's report](https://www.bleepingcomputer.com/news/microsoft/microsoft-confirms-kb5132061-installation-issues-0x80070306-0x800f0989-0x800f0993-errors/) (12 November):

- **Who was affected:** a limited number of Windows 11 devices that had installed the **October 2026 non-security preview update (KB5127936)**. Devices that skipped the preview were fine.
- **Symptoms:** the install stalled midway, retried repeatedly, or failed with `0x80070306`, `0x800f0989` or `0x800f0993`.
- **The fix:** applied automatically on Microsoft's side, rolling out over 24 to 48 hours from 11 November, 10 am PT. Once repaired, devices pick up the November update through Windows Update as normal. Microsoft's advice to admins still seeing failures after 48 hours is to contact support.

So nothing for most people to do, and no manual workaround to apply. That's the good news.

## Why it matters anyway

The interesting part isn't the error codes, it's the trigger. **Only machines that had opted into an optional preview were hit.** The preview went out in October, looked harmless, and a month later it was the thing standing between those PCs and a security fix.

On a home PC that's an annoyance. On a fleet it's a gap: every device stuck in a retry loop is a device that's a patch behind, often without anyone noticing until the compliance report goes amber.

## My take: keep previews in a ring, not on the fleet

![Three deployment rings: a few test devices get updates first, then a pilot group, then everyone else](/posts/november-windows-update-install-failures/rings.svg "Update rings: problems surface in the small rings first.")

This is exactly what update rings are for. A setup I'd recommend for a small or mid-sized environment:

1. **Test ring:** a handful of IT-owned machines. Previews and new builds land here, and only here.
2. **Pilot ring:** a small slice of real users across departments, a few days behind.
3. **Broad ring:** everyone else, deferred until the pilot has been quiet for a week.

A few habits make this work in practice:

- **Don't let previews reach production.** If people can install optional updates themselves, turn that off through policy for anything outside the test ring.
- **Watch Windows release health.** Known issues like this one are posted in the Microsoft 365 admin centre, often before the forums catch up.
- **Report on failed installs, not just success rates.** "98% compliant" hides the 2% stuck in a loop; a list of devices with repeated failures is what gets them fixed.
- **Give it the 48 hours.** When Microsoft says a fix is rolling out server-side, resist the urge to start removing updates by hand. Note the affected machines, check back, then escalate.

## Bottom line

Microsoft handled this one reasonably: limited scope, a clear statement, an automatic fix. But "it fixes itself in two days" only works if you know which machines are waiting. Rings, sensible policies and a habit of reading release health turn an incident like this from a scramble into a footnote.

> Sources: Microsoft's Windows release health notice, as quoted by BleepingComputer, 12 November 2026. Details may have moved on since; check the release health page for the current status.
