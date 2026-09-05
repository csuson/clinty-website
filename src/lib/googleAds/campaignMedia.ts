import type { CampaignMediaAsset, CreativeAssetKind } from '../../constants/adCampaigns'
import { supabase } from '../supabase'

export const CAMPAIGN_MEDIA_BUCKET = 'campaign-media'
export const CAMPAIGN_MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm'
const MAX_BYTES = 50 * 1024 * 1024

function kindFromFile(file: File): CreativeAssetKind {
  if (file.type.startsWith('video/')) return 'video'
  return 'image'
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'creative'
}

export async function uploadCampaignMediaFiles(files: File[]): Promise<CampaignMediaAsset[]> {
  if (!supabase) {
    throw new Error('Sign in to Clinty to upload campaign photos and videos.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) {
    throw new Error('Sign in to Clinty again, then upload your creative files.')
  }

  const uploaded: CampaignMediaAsset[] = []
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} is over 50 MB. Use a smaller file or a public URL.`)
    }
    const path = `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    const result = await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    if (result.error) {
      throw new Error(result.error.message || `Could not upload ${file.name}.`)
    }
    const { data } = supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).getPublicUrl(path)
    uploaded.push({
      name: file.name.replace(/\.[^.]+$/, ''),
      kind: kindFromFile(file),
      url: data.publicUrl,
    })
  }
  return uploaded
}
