import { Link } from 'react-router-dom'
import { FAQ_ARTICLES, faqArticlePath } from '../constants/faq'

export default function Faq() {
  return (
    <div className="pt-32 pb-24 px-6">
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
