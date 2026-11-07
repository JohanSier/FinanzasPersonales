import type { Access, CollectionConfig } from 'payload'

const isPayloadAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const Admins: CollectionConfig = {
  slug: 'admins',
  access: {
    // Allow creating the very first admin so the panel can be bootstrapped;
    // once one exists, only admins can manage accounts.
    create: async ({ req }) =>
      (await req.payload.count({ collection: 'admins', overrideAccess: true, req }))
        .totalDocs === 0,
    delete: isPayloadAdmin,
    read: isPayloadAdmin,
    update: isPayloadAdmin,
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
  versions: false,
}
