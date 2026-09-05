export type FaqArticle = {
  slug: string
  title: string
  summary: string
  category: string
}

export const FAQ_ARTICLES: FaqArticle[] = [
  {
    slug: 'manual-ad-campaign-import',
    title: 'How do I manually import a downloaded ad campaign?',
    summary:
      'Step-by-step instructions for building Google Ads, Meta, Yelp, and Reddit campaigns from Clinty’s media-plan.json export.',
    category: 'Ad Campaigns',
  },
]

export function faqArticlePath(slug: string): string {
  return `/faq/${slug}`
}
