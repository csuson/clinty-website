import { useState } from 'react'

const PLATFORMS = [
  {
    name: 'Moodle',
    download: 'Download .h5p (full bundle)',
    notes: [
      'Upload to Content bank or as an H5P activity.',
      'Libraries can install from the file if your admin allows it (capability: h5p:updatelibraries).',
      'Site admin should run the scheduled task “Download available H5P content types from h5p.org”, or install libraries manually.',
      'If libraries are already on the site, a content-only file also works — use “Download for Lumi” style (libraries omitted).',
    ],
  },
  {
    name: 'WordPress',
    download: 'Download .h5p (full bundle)',
    notes: [
      'Requires the H5P plugin (H5P → Add new → Upload).',
      'Libraries install from the file when you have manage_h5p_libraries.',
      'On Hostinger: raise PHP upload_max_filesize and post_max_size in hPanel → Advanced → PHP Configuration if uploads fail (413 or size errors).',
      'Use “Download .h5p” (full bundle). Re-download after updates — older files may fail validation with “File …/ not allowed”.',
    ],
  },
  {
    name: 'Hostinger',
    download: 'Depends on what you host',
    notes: [
      'Hostinger is web hosting, not an LMS — use the row for your app (usually WordPress or Moodle).',
      'WordPress + H5P plugin: use the full .h5p download; increase PHP upload limits in hPanel if needed.',
      'Moodle on Hostinger: same as Moodle — full .h5p; ensure H5P libraries are available on the site.',
      'Plain static hosting: .h5p files cannot run by themselves — export HTML/SCORM from Lumi Desktop instead.',
    ],
  },
  {
    name: 'Lumi Cloud',
    download: 'Download for Lumi (content only)',
    notes: [
      'Lumi Cloud does not install libraries from uploads — it uses pre-installed copies.',
      'Always use “Download for Lumi”; do not upload the full bundle.',
      'If upload still fails, contact Lumi support (their Question Set library may need repair).',
    ],
  },
  {
    name: 'Canvas',
    download: 'Not .h5p directly',
    notes: [
      'Most Canvas sites have no native .h5p upload.',
      'Options: H5P.com LTI integration, or create in Lumi Desktop and export as HTML or SCORM, then upload to Canvas Files.',
      'Our .h5p downloads are for Moodle/WordPress-style H5P integrations, not Canvas directly.',
    ],
  },
] as const

export default function H5PPlatformGuide() {
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-2xl border border-navy-900/10 bg-white/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-navy-900/[0.02]"
      >
        <span>
          <span className="block font-medium text-navy-900">Where are you uploading?</span>
          <span className="block text-sm text-navy-600 mt-0.5">
            Moodle, WordPress, Hostinger, Lumi, and Canvas each expect something different.
          </span>
        </span>
        <span className="text-sm text-navy-500 shrink-0">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open ? (
        <div className="px-6 pb-6 border-t border-navy-900/5 space-y-5">
          <p className="text-sm text-navy-600 pt-4">
            All downloads include <code className="text-xs bg-navy-900/5 px-1 rounded">h5p.json</code> and{' '}
            <code className="text-xs bg-navy-900/5 px-1 rounded">content/content.json</code>. The full bundle also
            embeds H5P libraries (including <code className="text-xs bg-navy-900/5 px-1 rounded">semantics.json</code>
            ) so platforms can install missing content types.
          </p>

          <ul className="space-y-4">
            {PLATFORMS.map((platform) => (
              <li key={platform.name} className="rounded-xl border border-navy-900/8 bg-cream/40 px-4 py-3">
                <p className="font-medium text-navy-900">{platform.name}</p>
                <p className="text-sm text-teal-800 mt-1">{platform.download}</p>
                <ul className="mt-2 space-y-1 text-sm text-navy-600 list-disc list-inside">
                  {platform.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
