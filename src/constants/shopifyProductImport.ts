/** Shopify product CSV columns (matches Shopify export/import format). */
export const SHOPIFY_PRODUCT_CSV_COLUMNS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option1 Linked To',
  'Option2 Name',
  'Option2 Value',
  'Option2 Linked To',
  'Option3 Name',
  'Option3 Value',
  'Option3 Linked To',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Unit Price Total Measure',
  'Unit Price Total Measure Unit',
  'Unit Price Base Measure',
  'Unit Price Base Measure Unit',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Google: Custom Product (product.metafields.mm-google-shopping.custom_product)',
  'Color (product.metafields.shopify.color-pattern)',
  'Hardware material (product.metafields.shopify.hardware-material)',
  'Material (product.metafields.shopify.material)',
  'Recommended skill level (product.metafields.shopify.recommended-skill-level)',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
] as const

export type ShopifyProductCsvColumn = (typeof SHOPIFY_PRODUCT_CSV_COLUMNS)[number]

/** Columns shown in the mapping UI (most common import fields). */
export const SHOPIFY_IMPORT_MAPPING_COLUMNS: ShopifyProductCsvColumn[] = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Inventory Qty',
  'Variant Barcode',
  'Image Src',
  'Status',
]

export type GenericImportDefaults = {
  vendor: string
  productType: string
  tags: string
  published: boolean
  inventoryQty: number
  option1Name: string
  option2Name: string
  status: string
}

export const DEFAULT_GENERIC_IMPORT_DEFAULTS: GenericImportDefaults = {
  vendor: '',
  productType: '',
  tags: '',
  published: true,
  inventoryQty: 1,
  option1Name: 'Title',
  option2Name: 'Size',
  status: 'active',
}

/** Excel header aliases → Shopify column (normalized lowercase). */
export const HEADER_ALIASES: Record<string, ShopifyProductCsvColumn> = {
  handle: 'Handle',
  title: 'Title',
  'product title': 'Title',
  name: 'Title',
  product: 'Title',
  'body (html)': 'Body (HTML)',
  body: 'Body (HTML)',
  description: 'Body (HTML)',
  vendor: 'Vendor',
  brand: 'Vendor',
  type: 'Type',
  'product type': 'Type',
  category: 'Product Category',
  'product category': 'Product Category',
  tags: 'Tags',
  published: 'Published',
  'option1 name': 'Option1 Name',
  color: 'Option1 Value',
  'option1 value': 'Option1 Value',
  'option2 name': 'Option2 Name',
  size: 'Option2 Value',
  'size liters': 'Option2 Value',
  'option2 value': 'Option2 Value',
  'option3 name': 'Option3 Name',
  'option3 value': 'Option3 Value',
  sku: 'Variant SKU',
  'variant sku': 'Variant SKU',
  price: 'Variant Price',
  'variant price': 'Variant Price',
  srp: 'Variant Price',
  msrp: 'Variant Price',
  'suggested retail price': 'Variant Price',
  'suggested retail': 'Variant Price',
  'compare at': 'Variant Compare At Price',
  'compare at price': 'Variant Compare At Price',
  'variant compare at price': 'Variant Compare At Price',
  'inventory qty': 'Variant Inventory Qty',
  'variant inventory qty': 'Variant Inventory Qty',
  qty: 'Variant Inventory Qty',
  quantity: 'Variant Inventory Qty',
  barcode: 'Variant Barcode',
  'variant barcode': 'Variant Barcode',
  'image src': 'Image Src',
  image: 'Image Src',
  status: 'Status',
}

export type ColumnMapping = Partial<Record<ShopifyProductCsvColumn, string>>

export type GenericImportConfig = {
  sheetName: string
  headerRow: number
  mappings: ColumnMapping
  defaults: GenericImportDefaults
  groupByColumn: string
}

export const DEFAULT_GENERIC_IMPORT_CONFIG: GenericImportConfig = {
  sheetName: '',
  headerRow: 1,
  mappings: {},
  defaults: DEFAULT_GENERIC_IMPORT_DEFAULTS,
  groupByColumn: '',
}
