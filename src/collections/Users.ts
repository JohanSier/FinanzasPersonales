import { APIError, type CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Cuenta personal', plural: 'Cuenta personal' },
  auth: { tokenExpiration: 60 * 60 * 24 * 30, maxLoginAttempts: 5, lockTime: 600000 },
  admin: { useAsTitle: 'email', group: 'Mi cuenta' },
  access: {
    admin: () => false,
    create: ({ req }) => req.context.appSignup === true,
    read: ({ req }) =>
      req.user?.collection === 'admins'
        ? true
        : req.user?.collection === 'users'
          ? { id: { equals: req.user.id } }
          : false,
    update: ({ req }) =>
      req.user?.collection === 'users' ? { id: { equals: req.user.id } } : false,
    delete: () => false,
  },
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 80 },
    {
      name: 'ownerKey',
      type: 'text',
      required: true,
      unique: true,
      access: { create: ({ req }) => req.context.appSignup === true, update: () => false },
      admin: { hidden: true },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create') {
          if (typeof data?.password !== 'string' || data.password.length < 10)
            throw new APIError('Usa una contraseña de al menos 10 caracteres.', 400)
          data.ownerKey = 'personal-owner'
        } else if (data) data.ownerKey = originalDoc?.ownerKey
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return
        const result = await req.payload.find({
          collection: 'finance-workspaces',
          where: { key: { equals: 'mi-espacio' } },
          limit: 1,
          overrideAccess: true,
          req,
          depth: 0,
        })
        const workspace = result.docs[0]
        if (!workspace || workspace.owner)
          throw new APIError('Este espacio ya tiene propietario o aún no está preparado.', 409)
        // One-time owner setup; the unique ownerKey prevents a second account.
        await req.payload.update({
          collection: 'finance-workspaces',
          id: workspace.id,
          data: { owner: doc.id },
          overrideAccess: true,
          req,
        })
      },
    ],
  },
}
