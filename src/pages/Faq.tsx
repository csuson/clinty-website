import { Link } from 'react-router-dom'
import PageMeta from '../components/PageMeta'
import { FAQ_ARTICLES, faqArticlePath } from '../constants/faq'
import { absoluteUrl, faqPageJsonLd } from '../constants/seo'

const FAQ_JSON_LD = faqPageJsonLd(
  FAQ_ARTICLES.map((article) => ({
    title: article.title,
    summary: article.summary,
    url: absoluteUrl(faqArticlePath(article.slug)),
  })),
)

export default function Faq() {
  return (
    <div className="pt-32 pb-24 px-6">
      <PageMeta
        title="FAQ"
        description="Help center for Clinty AI agents, integrations, and multi-platform ad campaigns."
        path="/faq"
        jsonLd={FAQ_JSON_LD}
      />
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <h1 className="font-serif text-4xl md:text-5xl text-navy-900 mb-4">
            Frequently asked <em className="text-teal-500 not-italic">questions</em>
          </h1>
          <p className="text-navy-600 text-lg leading-relaxed">
            Guides for Clinty features, integrations, and ad campaigns. Can&apos;t find what you need?{' '}
            <Link to="/contact" className="text-teal-600 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </header>

        <div className="space-y-4">
          {FAQ_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              to={faqArticlePath(article.slug)}
              className="block bg-white rounded-2xl border border-navy-900/5 p-6 shadow-sm hover:border-teal-400/30 hover:shadow-md transition-all"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-teal-600 mb-2">
                {article.category}
              </p>
              <h2 className="text-lg font-semibold text-navy-900 mb-2">{article.title}</h2>
              <p className="text-sm text-navy-600">{article.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
