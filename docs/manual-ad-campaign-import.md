# Manual ad campaign import guide

After Clinty drafts your campaigns, you can download **`media-plan.json`** from **Account → Ad Campaigns** (`/account/google-ads`) on the complete step.

That file is a **blueprint** for your team. Google Ads, Meta Ads Manager, and Yelp Ads do **not** accept this JSON as a direct upload. Use the fields below to recreate each campaign manually (or via each platform’s API).

## JSON structure

The download is usually shaped like:

```json
{
  "google": { },
  "facebook": { },
  "yelp": { }
}
```

If Clinty also saved a full `media_plan` object, it may include platform budget shares and combined rationale. Sections for platforms you did not select may be `null`.

Shared snapshot fields (when present):

| Field | Purpose |
|-------|---------|
| `launch_checklist` | Pre-launch QA items per platform |
| `rationale` | Strategy notes from the campaign agent |
| `review.issues` | Policy or completeness warnings to fix before going live |

**Recommendation:** Create everything **paused**, complete each platform’s checklist, then enable ads only after URLs, tracking, billing, and creative assets are verified.

---

## Google Ads (Search)

**JSON path:** `google`

### Key fields

| JSON path | Use in Google Ads |
|-----------|-------------------|
| `strategy.campaign_name` | Campaign name |
| `strategy.campaign_type` | Campaign type (typically Search) |
| `strategy.objective` | Goal / conversion focus |
| `strategy.geo_targets` | Location targeting |
| `strategy.audience_summary` | Audience notes (for reference) |
| `budget.daily_budget_usd` | Daily budget |
| `budget.monthly_budget_usd` | Monthly planning reference |
| `budget.bidding_strategy` | Bidding approach |
| `ad_groups[]` | One ad group per item |
| `ad_groups[].keywords[]` | Keywords (`match_type`: exact, phrase, broad) |
| `ad_groups[].negatives[]` | Ad group negative keywords |
| `ad_groups[].rsa` | Responsive Search Ad copy and URL |
| `campaign_negatives[]` | Campaign-level negative keywords |
| `extensions.sitelinks` | Sitelink assets |
| `extensions.callouts` | Callout assets |
| `launch_checklist` | QA before enabling |

### Steps

1. Sign in to [Google Ads](https://ads.google.com) or open **Google Ads Editor** for bulk entry.
2. **Create a new campaign** — choose Search (or match `strategy.campaign_type`).
3. Set **campaign name** from `strategy.campaign_name`.
4. Set **locations** from `strategy.geo_targets`.
5. Set **daily budget** from `budget.daily_budget_usd` (or derive from `monthly_budget_usd`).
6. Configure **bidding** to match `budget.bidding_strategy` as closely as the UI allows.
7. For each object in `ad_groups`:
   - Create an **ad group** named `name`.
   - Add **keywords** from `keywords[]` using the same match type (Exact / Phrase / Broad).
   - Add **negative keywords** from `negatives[]`.
   - Create a **Responsive Search Ad**:
     - Headlines → `rsa.headlines`
     - Descriptions → `rsa.descriptions`
     - Final URL → `rsa.final_url`
     - Display path → `rsa.path1`, `rsa.path2`
8. Add **campaign-level negatives** from `campaign_negatives`.
9. Add **assets** from `extensions` (sitelinks, callouts) if present.
10. Leave the campaign **paused** until `launch_checklist` is complete.

### Tools

- **Google Ads UI** — best for a single campaign or few ad groups.
- **Google Ads Editor** — faster for many keywords/ad groups; still manual entry, no Clinty JSON import.

---

## Meta (Facebook / Instagram)

**JSON path:** `facebook`

### Key fields

| JSON path | Use in Ads Manager |
|-----------|-------------------|
| `campaign_name` | Campaign name |
| `objective` | Campaign objective |
| `monthly_budget_usd` | Budget planning |
| `daily_budget_usd` | Daily budget (campaign or ad set) |
| `bid_strategy` | Bid strategy |
| `ad_sets[]` | One ad set per item |
| `ad_sets[].locations` | Geo targeting |
| `ad_sets[].age_min`, `age_max` | Age range |
| `ad_sets[].interests` | Interest targeting |
| `ad_sets[].exclusions` | Exclusions |
| `ad_sets[].placements` | Placements |
| `ad_sets[].ads[]` | Ad creative and copy |
| `launch_checklist` | QA before enabling |

### Ad-level fields (`ad_sets[].ads[]`)

| JSON field | Ads Manager field |
|------------|-------------------|
| `primary_text` | Primary text |
| `headline` | Headline |
| `description` | Description |
| `call_to_action` | Call to action button |
| `landing_page_url` | Website URL |
| `image_concept` | Brief for image/video creative (upload asset separately) |

### Steps

1. Open [Meta Ads Manager](https://adsmanager.facebook.com).
2. Click **Create** → **Campaign**.
3. Set **campaign name** from `campaign_name`.
4. Choose **objective** matching `objective`.
5. Set **budget** at campaign or ad set level using `daily_budget_usd` / `monthly_budget_usd`.
6. For each object in `ad_sets`:
   - Create an **ad set** named `name`.
   - Set **budget** from `daily_budget_usd`.
   - Configure **audience**: locations, age range, interests, exclusions.
   - Set **placements** from `placements` (or use Advantage+ placements).
7. For each object in `ad_sets[].ads`:
   - Create an **ad** with copy from `primary_text`, `headline`, `description`.
   - Set **CTA** from `call_to_action`.
   - Set **URL** from `landing_page_url`.
   - Upload **image or video** based on `image_concept` (required — Meta does not import concept text as media).
8. Set campaign and ad sets to **Paused** before review.
9. Complete `launch_checklist` before publishing.

---

## Yelp Ads

**JSON path:** `yelp`

### Key fields

| JSON path | Use in Yelp Ads |
|-----------|-----------------|
| `campaign_name` | Program / campaign name |
| `program_type` | Program type |
| `ad_goal` | Ad goal |
| `monthly_budget_usd` | Monthly budget |
| `daily_budget_usd` | Daily budget reference |
| `is_autobid` | Auto-bid on/off |
| `max_bid_usd` | Max bid (if manual bidding) |
| `pacing_method` | Pacing |
| `fee_period` | Billing period |
| `categories` | Business categories |
| `geo_targets` | Location targeting |
| `radius_miles` | Radius around locations |
| `programs[]` | Individual ad programs |
| `launch_checklist` | QA before enabling |

### Program-level fields (`programs[]`)

| JSON field | Yelp UI |
|------------|---------|
| `name` | Program name |
| `theme` | Theme / notes |
| `monthly_budget_usd` | Program budget |
| `categories` | Categories |
| `custom_ad_text` | Ad copy |
| `specialties_text` | Specialties / services text |
| `photo_concept` | Photo selection brief |
| `negatives` | Exclusions (if supported in your account) |
| `ad_goal` | Program goal |

### Steps

1. Sign in to [Yelp for Business](https://biz.yelp.com) → **Yelp Ads** (or your Yelp partner advertiser portal).
2. Start **Create** or **Edit** ad program.
3. Set **name** from `campaign_name`.
4. Set **goal** from `ad_goal` and `program_type`.
5. Choose **categories** from `categories`.
6. Set **location targeting** from `geo_targets` and `radius_miles`.
7. Configure **budget and bidding**:
   - `monthly_budget_usd`, `daily_budget_usd`
   - `is_autobid`, `max_bid_usd`, `pacing_method`, `fee_period`
8. For each object in `programs`:
   - Add or configure a program with `custom_ad_text`, `specialties_text`, and budget.
   - Upload a photo guided by `photo_concept`.
   - Apply `negatives` if your UI supports them.
9. Keep the program **inactive / paused** until listing, categories, and copy are verified.
10. Complete `launch_checklist` before going live.

**Note:** Yelp automated publish requires partner API credentials (configured in Clinty under **Integrations → Ad Campaigns**). Manual setup uses the Yelp business or partner UI.

---

## End-to-end workflow

1. Draft campaigns in **Account → Ad Campaigns**.
2. Answer any clarifying questions and review the draft.
3. On the complete step, click **Download JSON**.
4. Open `media-plan.json` and work **one platform at a time**.
5. Build campaigns **paused** in Google Ads, Meta Ads Manager, and Yelp Ads using the mappings above.
6. Resolve any issues in `review.issues` (if included in your session export).
7. Enable campaigns only after each platform’s `launch_checklist` is done.

---

## Alternative: publish from Clinty

To skip manual re-entry, connect publish credentials in **Account → Integrations → Ad Campaigns**:

| Platform | Requirements |
|----------|----------------|
| **Google** | OAuth + Customer ID (+ `GOOGLE_ADS_DEVELOPER_TOKEN` in Supabase) |
| **Meta** | OAuth + Ad account + Page |
| **Yelp** | Partner ID, API key, business ID |

On the review step, check **Create paused campaigns in Google Ads, Meta Ads Manager, and/or Yelp Ads after I approve**, then click **Approve draft**. Clinty creates **paused** campaigns in each connected platform.

For the full guide, see the [FAQ: Manual ad campaign import](/faq/manual-ad-campaign-import) page.

