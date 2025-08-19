import { z } from 'zod'
import { normalize } from './facets/noticeQueries.js'

const BaseFacetSchema = z.object({
  timestamp: z.number().default(() => Date.now()),
  label: z.string().optional(),
})

const QueryFacetSchema = BaseFacetSchema.extend({
  type: z.literal('query'),
  query: z.string(),
})

const NoticeNumberFacetSchema = BaseFacetSchema.extend({
  type: z.literal('notice-number'),
  value: z.string().
    regex(/^\s*\d{1,8}-\d{4}\s*$/,
      'Invalid notice number format. Expected format: number-year (e.g., 12345-2023)').
    transform(normalize),
})

const NamedNodeFacetSchema = BaseFacetSchema.extend({
  type: z.literal('named-node'),
  term: z.object({
    value: z.string().url(),
  }),
})

const FacetSchema = z.discriminatedUnion('type', [
  QueryFacetSchema,
  NoticeNumberFacetSchema,
  NamedNodeFacetSchema,
])

// Validation functions
const validateFacet = (data) => FacetSchema.parse(data)
const safeParseFacet = (data) => FacetSchema.safeParse(data)

export { validateFacet, safeParseFacet }
