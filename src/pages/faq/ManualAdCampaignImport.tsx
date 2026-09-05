import { Link } from 'react-router-dom'
import FaqPageLayout, {
  FaqCallout,
  FaqSection,
  FaqSteps,
  FaqSubsection,
  FaqTable,
} from '../../components/FaqPageLayout'
import PageMeta from '../../components/PageMeta'
import { articleJsonLd } from '../../constants/seo'

const ARTICLE_PATH = '/faq/manual-ad-campaign-import'
const ARTICLE_DESCRIPTION =
  'Step-by-step guide to manually import Clinty ad campaign exports into Google Ads, Meta Ads Manager, Yelp Ads, and Reddit Ads.'

export default function ManualAdCampaignImport() {
  return (
    <>
      <PageMeta
        title="Manual ad campaign import"
        description={ARTICLE_DESCRIPTION}
        path={ARTICLE_PATH}
        jsonLd={articleJsonLd({
          title: 'Manual ad campaign import',
          description: ARTICLE_DESCRIPTION,
          path: ARTICLE_PATH,
        })}
      />
      <FaqPageLayout
        title="Manual ad campaign import"
        description="How to build Google Ads, Meta, Yelp, and Reddit campaigns from Clinty’s media-plan.json export."
      >
      <FaqCallout>
        After Clinty drafts your campaigns, download <strong className="text-navy-900">media-plan.json</strong>{' '}
        from{' '}
        <Link to="/account/google-ads" className="text-teal-600 hover:underline">
          Account → Ad Campaigns
        </Link>{' '}
        on the complete step. That file is a blueprint — Google, Meta, Yelp, and Reddit do not accept it as a
        direct upload.
      </FaqCallout>

      <FaqSection title="JSON structure">
        <p>The download is usually shaped like:</p>
        <pre className="text-xs bg-cream border border-navy-900/10 rounded-xl p-4 overflow-x-auto text-navy-800">
{`{
  "google": { },
  "facebook": { },
  "yelp": { },
  "reddit": { }
}`}
        </pre>
        <p>
          Sections for platforms you did not select may be <code className="text-xs bg-cream px-1 py-0.5 rounded">null</code>.
          Use each section to recreate that platform&apos;s campaign manually.
        </p>
        <FaqTable
          headers={['Field', 'Purpose']}
          rows={[
            ['launch_checklist', 'Pre-launch QA items per platform'],
            ['rationale', 'Strategy notes from the campaign agent'],
            ['review.issues', 'Policy or completeness warnings to fix before going live'],
          ]}
        />
        <p>
          <strong className="text-navy-900">Recommendation:</strong> Create everything paused, complete each
          platform&apos;s checklist, then enable ads only after URLs, tracking, billing, and creative assets
          are verified.
        </p>
      </FaqSection>

      <FaqSection title="Google Ads (Search)">
        <p>
          <strong className="text-navy-900">JSON path:</strong> <code className="text-xs bg-cream px-1 py-0.5 rounded">google</code>
        </p>

        <FaqSubsection title="Key fields">
          <FaqTable
            headers={['JSON path', 'Use in Google Ads']}
            rows={[
              ['strategy.campaign_name', 'Campaign name'],
              ['strategy.campaign_type', 'Campaign type (typically Search)'],
              ['strategy.geo_targets', 'Location targeting'],
              ['budget.daily_budget_usd', 'Daily budget'],
              ['budget.bidding_strategy', 'Bidding approach'],
              ['ad_groups[]', 'One ad group per item'],
              ['ad_groups[].keywords[]', 'Keywords (exact, phrase, broad)'],
              ['ad_groups[].rsa', 'Responsive Search Ad copy and URL'],
              ['campaign_negatives[]', 'Campaign-level negative keywords'],
              ['extensions.sitelinks / callouts', 'Ad assets'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Steps">
          <FaqSteps
            steps={[
              'Sign in to Google Ads or open Google Ads Editor for bulk entry.',
              'Create a new Search campaign (or match strategy.campaign_type).',
              'Set campaign name from strategy.campaign_name.',
              'Set locations from strategy.geo_targets.',
              'Set daily budget from budget.daily_budget_usd.',
              'Configure bidding to match budget.bidding_strategy.',
              'For each ad_groups item: create the ad group, add keywords and negatives, then build the Responsive Search Ad from rsa (headlines, descriptions, final URL, paths).',
              'Add campaign_negatives and extensions (sitelinks, callouts) if present.',
              'Leave the campaign paused until launch_checklist is complete.',
            ]}
          />
        </FaqSubsection>

        <p>
          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Open Google Ads
          </a>
        </p>
      </FaqSection>

      <FaqSection title="Meta (Facebook / Instagram)">
        <p>
          <strong className="text-navy-900">JSON path:</strong>{' '}
          <code className="text-xs bg-cream px-1 py-0.5 rounded">facebook</code>
        </p>

        <FaqSubsection title="Key fields">
          <FaqTable
            headers={['JSON path', 'Use in Ads Manager']}
            rows={[
              ['campaign_name', 'Campaign name'],
              ['objective', 'Campaign objective'],
              ['daily_budget_usd', 'Daily budget (campaign or ad set)'],
              ['ad_sets[]', 'One ad set per item'],
              ['ad_sets[].locations, age_min, age_max', 'Audience targeting'],
              ['ad_sets[].interests / exclusions', 'Interests and exclusions'],
              ['ad_sets[].ads[]', 'Ad copy and creative brief'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Ad-level fields (ad_sets[].ads[])">
          <FaqTable
            headers={['JSON field', 'Ads Manager field']}
            rows={[
              ['primary_text', 'Primary text'],
              ['headline', 'Headline'],
              ['description', 'Description'],
              ['call_to_action', 'Call to action button'],
              ['landing_page_url', 'Website URL'],
              ['creative_format', 'image, video, or carousel'],
              ['media[]', 'Public image/video URLs already attached to the ad'],
              ['image_concept', 'Brief for any asset you still need to produce'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Steps">
          <FaqSteps
            steps={[
              'Open Meta Ads Manager and click Create → Campaign.',
              'Set campaign name and objective from the JSON.',
              'Set budget at campaign or ad set level.',
              'For each ad_sets item: create the ad set, configure audience and placements.',
              'For each ad in ad_sets[].ads: add copy, CTA, URL, and upload image/video based on image_concept.',
              'Set campaign and ad sets to Paused before review.',
              'Complete launch_checklist before publishing.',
            ]}
          />
        </FaqSubsection>

        <p>
          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Open Meta Ads Manager
          </a>
        </p>
      </FaqSection>

      <FaqSection title="Yelp Ads">
        <p>
          <strong className="text-navy-900">JSON path:</strong>{' '}
          <code className="text-xs bg-cream px-1 py-0.5 rounded">yelp</code>
        </p>

        <FaqSubsection title="Key fields">
          <FaqTable
            headers={['JSON path', 'Use in Yelp Ads']}
            rows={[
              ['campaign_name', 'Program / campaign name'],
              ['ad_goal / program_type', 'Ad goal and program type'],
              ['monthly_budget_usd', 'Monthly budget'],
              ['categories', 'Business categories'],
              ['geo_targets / radius_miles', 'Location targeting'],
              ['programs[]', 'Individual ad programs'],
              ['is_autobid / max_bid_usd', 'Bidding settings'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Steps">
          <FaqSteps
            steps={[
              'Sign in to Yelp for Business → Yelp Ads (or your partner advertiser portal).',
              'Create or edit an ad program using campaign_name, ad_goal, and program_type.',
              'Choose categories and set geo_targets / radius_miles.',
              'Configure budget and bidding (monthly_budget_usd, is_autobid, max_bid_usd, etc.).',
              'For each programs item: add custom_ad_text, specialties_text, budget, and a photo guided by photo_concept.',
              'Keep the program inactive until listing, categories, and copy are verified.',
              'Complete launch_checklist before going live.',
            ]}
          />
        </FaqSubsection>

        <p>
          <a
            href="https://biz.yelp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Open Yelp for Business
          </a>
        </p>
      </FaqSection>

      <FaqSection title="Reddit Ads">
        <p>
          <strong className="text-navy-900">JSON path:</strong>{' '}
          <code className="text-xs bg-cream px-1 py-0.5 rounded">reddit</code>
        </p>

        <FaqSubsection title="Key fields">
          <FaqTable
            headers={['JSON path', 'Use in Reddit Ads']}
            rows={[
              ['campaign_name', 'Campaign name'],
              ['objective', 'Campaign objective'],
              ['daily_budget_usd / monthly_budget_usd', 'Budget'],
              ['bid_strategy', 'Bidding (typically CPC)'],
              ['ad_groups[]', 'One ad group per item'],
              ['ad_groups[].communities[]', 'Subreddits (without the r/ prefix)'],
              ['ad_groups[].interests / keywords', 'Additional targeting'],
              ['ad_groups[].ads[]', 'Ad copy and creative brief'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Ad-level fields (ad_groups[].ads[])">
          <FaqTable
            headers={['JSON field', 'Reddit Ads field']}
            rows={[
              ['headline', 'Headline (keep under 80 characters when possible)'],
              ['body', 'Body / post text'],
              ['call_to_action', 'Call to action'],
              ['landing_page_url', 'Destination URL'],
              ['creative_format', 'image, video, or carousel'],
              ['media[]', 'Public image/video URLs already attached to the ad'],
              ['image_concept', 'Brief for any asset you still need to produce'],
            ]}
          />
        </FaqSubsection>

        <FaqSubsection title="Steps">
          <FaqSteps
            steps={[
              'Open Reddit Ads Manager and create a new campaign.',
              'Set campaign name and objective from the JSON. Leave the campaign paused.',
              'For each ad_groups item: create the ad group, set daily budget, and target communities, interests, and locations.',
              'For each ad in ad_groups[].ads: add headline, body, CTA, URL, and upload image/video based on image_concept.',
              'Complete launch_checklist before enabling.',
            ]}
          />
        </FaqSubsection>

        <p>
          <a
            href="https://ads.reddit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Open Reddit Ads Manager
          </a>
        </p>
      </FaqSection>

      <FaqSection title="End-to-end workflow">
        <FaqSteps
          steps={[
            'Draft campaigns in Account → Ad Campaigns.',
            'Answer clarifying questions and review the draft.',
            'On the complete step, click Download JSON.',
            'Open media-plan.json and work one platform at a time.',
            'Build paused campaigns in Google Ads, Meta Ads Manager, Yelp Ads, and Reddit Ads.',
            'Resolve any review.issues before going live.',
            'Enable campaigns only after each launch_checklist is done.',
          ]}
        />
      </FaqSection>

      <FaqSection title="Alternative: publish from Clinty">
        <p>
          To skip manual re-entry, connect publish credentials in{' '}
          <Link to="/account/integrations" className="text-teal-600 hover:underline">
            Account → Integrations → Ad Campaigns
          </Link>
          :
        </p>
        <FaqTable
          headers={['Platform', 'Requirements']}
          rows={[
            ['Google', 'OAuth + Customer ID (+ GOOGLE_ADS_DEVELOPER_TOKEN in Supabase)'],
            ['Meta', 'OAuth + Ad account + Page'],
            ['Yelp', 'Partner username, password, business ID'],
            ['Reddit', 'Access token + Ad account ID (pixel optional)'],
          ]}
        />
        <p>
          On the review step, check{' '}
          <strong className="text-navy-900">
            Create paused campaigns in Google Ads, Meta Ads Manager, Yelp Ads, and/or Reddit Ads after I approve
          </strong>
          , then click <strong className="text-navy-900">Approve draft</strong>. Clinty creates paused
          campaigns in each connected platform.
        </p>
      </FaqSection>
    </FaqPageLayout>
    </>
  )
}
