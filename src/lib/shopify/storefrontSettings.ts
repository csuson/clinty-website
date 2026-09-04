import { supabase } from '../supabase'
import { getFunctionErrorMessage } from '../supabaseFunctions'

export async function saveShopifyStorefront(input: {
  shopDomain: string
  storefrontToken: string
  tokenType?: 'public' | 'private'
}): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const result = await supabase.functions.invoke('shopify-storefront-token', {
    body: {
      shop_domain: input.shopDomain,
      storefront_token: input.storefrontToken,
      token_type: input.tokenType ?? 'public',
    },
  })

  const data = result.data as { error?: string; success?: boolean } | null
  if (result.error || data?.error) {
    throw new Error(await getFunctionErrorMessage(result.error, data))
  }
}
