# Reddit ban appeal

Submit at **reddit.com/appeals** while logged in as u/Front-Recording7391.

---

## Before you send it

**Check the stated reason first.** The ban notice normally names one: spam,
automation, undisclosed self-promotion, ban evasion, or vote manipulation. The
letter below is written for spam/automation, which is the most likely given the
comment bot. If it says something else, tell me and I will rewrite it, because
an appeal that answers the wrong accusation reads as evasive.

**Send one appeal and then wait.** Repeat submissions get deprioritised. A
reply can take days to weeks, and often there is no reply at all.

**Do not create another account while this is pending.** That converts a
spam ban into ban evasion, which is much harder to come back from.

---

## The full letter (for a reply, not the form)

```
Hi,

I'm appealing the ban on u/Front-Recording7391.

I want to be straight about what I did rather than claim I don't know why this happened. I run a small trading education business, and I set up an automated system that posted comments to trading subreddits roughly four times a day over several months. It generated the comments and posted them without me reviewing each one. I also had it auto-submitting my own articles.

That was against the rules on spam and automated posting, and I understand why it was actioned. It was my decision and my setup, so it's on me.

I have now removed the scheduled jobs entirely and disabled the posting code behind a switch that is turned off, so nothing can run even accidentally. No automated commenting or submitting is happening from this account.

If the account is reinstated, I will only comment manually, only where I actually have something useful to add, and I will not link to my own site in comments. If self-promotion is ever relevant I will follow the individual subreddit's rules on it or leave it out.

I've had this account since 2024 and would like to take part properly. If there's anything else you need from me, I'm happy to provide it.

Thanks for reviewing this.
```

---

## The 250 character version (use this one)

The appeal form caps at 250 characters, so this is what actually goes in.

```
I set up software that posted comments and my own articles automatically, about 4 times a day for months. That is spam and it was my fault. I have shut it down completely. If reinstated I will only post manually and will not link to my site.
```

241 characters. Every sentence does one job: what I did, that it was wrong and
mine, that it is stopped, and what changes if I come back. Nothing else fits,
and nothing else matters to the person reading it.

Alternative at 238 characters if you prefer it blunter:

```
I automated comments and self-promo posts ~4x a day for months. That is spam and it was my decision. I have deleted the cron jobs and disabled the code entirely. If reinstated I will only comment manually and will not link to my own site.
```

Count before pasting. Some forms count whitespace and some strip trailing
newlines, so do not add a signature or a greeting.

The longer letter above is kept in case a human replies and asks for detail,
or if you ever get a form with more room.

## Why it's written this way

**It admits the specific behaviour.** Admins can see every comment and its
timing. A vague "I'm not sure why this happened" against a log of 640
bot-posted comments reads as dishonest and usually ends the conversation.

**It does not argue the ban was unfair.** Appeals that dispute the decision
get closed. Appeals that show the cause is fixed sometimes do not.

**The remedy is concrete and already true.** The crons are gone from
vercel.json and both posting paths are gated behind an env flag that is unset.
You are describing something you actually did, not something you promise to do.

**It is short.** These are processed in volume. Every extra paragraph lowers
the chance it gets read properly.

**No flattery, no hardship story, no promises about "adding value to the
community".** Those patterns are all over appeal templates and admins have
seen them thousands of times.

---

## Be realistic about the odds

Permanent bans for automated promotion are not often reversed. Send it,
then plan as though Reddit is closed to you, because for now it is.

If it is reinstated, the thing that would get you banned again is treating a
reinstatement as permission to resume at lower volume. It is not. Manual only.
