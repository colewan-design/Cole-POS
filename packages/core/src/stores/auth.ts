import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getPosRepository } from '@pos/core/services/runtime'
import {
  appPageKeys,
  defaultRoles,
  type AppPageKey,
  type AuthSession,
  type RoleDefinition,
  type UserAccount,
} from '@pos/shared/index'

const guestUserId = '__guest__'
const guestUsername = 'guest'
const guestDisplayName = 'Guest Demo'

function clonePermissions(role: RoleDefinition): RoleDefinition {
  return {
    ...role,
    permissions: { ...role.permissions },
  }
}

function mergeRoles(savedRoles: RoleDefinition[]) {
  const roleMap = new Map(savedRoles.map((role) => [role.id, clonePermissions(role)]))

  for (const role of defaultRoles) {
    if (!roleMap.has(role.id)) {
      roleMap.set(role.id, clonePermissions(role))
    }
  }

  return Array.from(roleMap.values())
}

export const useAuthStore = defineStore('auth', () => {
  const repository = getPosRepository()

  const users = ref<UserAccount[]>([])
  const roles = ref<RoleDefinition[]>(defaultRoles.map(clonePermissions))
  const session = ref<AuthSession | null>(null)
  const isReady = ref(false)
  const authError = ref('')

  const guestAccount = computed<UserAccount | null>(() => {
    const guestRole = roles.value.find((role) => role.id === 'guest')
    if (!guestRole) {
      return null
    }

    return {
      id: guestUserId,
      fullName: guestDisplayName,
      username: guestUsername,
      passwordHash: '',
      roleId: guestRole.id,
      createdAt: '',
    }
  })

  const currentUser = computed(() => {
    if (session.value?.userId === guestUserId) {
      return guestAccount.value
    }

    return users.value.find((user) => user.id === session.value?.userId) ?? null
  })

  const currentRole = computed(() =>
    roles.value.find((role) => role.id === currentUser.value?.roleId) ?? null,
  )

  const hasUsers = computed(() => users.value.length > 0)
  const canManageAccess = computed(() => currentRole.value?.id === 'admin')

  const accessiblePages = computed(() =>
    appPageKeys.filter((page) => currentRole.value?.permissions[page]),
  )

  const firstAccessiblePage = computed<AppPageKey | null>(() => accessiblePages.value[0] ?? null)

  async function initialize() {
    if (isReady.value) {
      return
    }

    const [savedUsers, savedRoles, savedSession] = await Promise.all([
      repository.loadUsers(),
      repository.loadRoles(),
      repository.loadSession(),
    ])

    users.value = savedUsers
    roles.value = mergeRoles(savedRoles.length > 0 ? savedRoles : defaultRoles)
    session.value = savedSession

    if (savedSession && savedSession.userId !== guestUserId && !savedUsers.some((user) => user.id === savedSession.userId)) {
      session.value = null
      await repository.saveSession(null)
    }

    isReady.value = true
  }

  function clearAuthError() {
    authError.value = ''
  }

  function canAccess(page: AppPageKey) {
    return Boolean(currentRole.value?.permissions[page])
  }

  async function login(username: string, password: string) {
    clearAuthError()
    const result = await repository.loginUser(username, password)

    if (!result) {
      authError.value = 'Incorrect username or password.'
      return false
    }

    users.value = await repository.loadUsers()
    session.value = result.session
    return true
  }

  async function register(input: {
    fullName: string
    username: string
    password: string
  }) {
    clearAuthError()

    const fullName = input.fullName.trim()
    const username = input.username.trim().toLowerCase()
    const password = input.password.trim()

    if (!fullName || !username || !password) {
      authError.value = 'Complete all registration fields.'
      return false
    }

    if (users.value.some((user) => user.username === username)) {
      authError.value = 'That username is already in use.'
      return false
    }

    const result = await repository.registerUser({ fullName, username, password })
    if (!result) {
      authError.value = 'Unable to create that account.'
      return false
    }

    users.value = await repository.loadUsers()
    session.value = result.session
    return true
  }

  async function loginAsGuest() {
    clearAuthError()

    if (!roles.value.some((role) => role.id === 'guest')) {
      authError.value = 'Guest access is not configured.'
      return false
    }

    session.value = {
      userId: guestUserId,
      signedInAt: new Date().toISOString(),
    }
    await repository.saveSession(session.value)
    return true
  }

  async function logout() {
    session.value = null
    await repository.saveSession(null)
  }

  async function updateUserRole(userId: string, roleId: string) {
    if (!canManageAccess.value) {
      return
    }

    await repository.updateUserRole(userId, roleId)
    users.value = await repository.loadUsers()
  }

  async function createRole(name: string) {
    if (!canManageAccess.value) {
      return false
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      authError.value = 'Role name is required.'
      return false
    }

    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!id || roles.value.some((role) => role.id === id)) {
      authError.value = 'Choose a unique role name.'
      return false
    }

    const role: RoleDefinition = {
      id,
      name: trimmedName,
      permissions: Object.fromEntries(
        appPageKeys.map((page) => [page, false]),
      ) as Record<AppPageKey, boolean>,
    }

    roles.value = [...roles.value, role]
    await repository.saveRoles(roles.value)
    return true
  }

  async function renameRole(roleId: string, name: string) {
    if (!canManageAccess.value) {
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    roles.value = roles.value.map((role) =>
      role.id === roleId ? { ...role, name: trimmedName } : role,
    )
    await repository.saveRoles(roles.value)
  }

  async function setRolePermission(roleId: string, page: AppPageKey, allowed: boolean) {
    if (!canManageAccess.value) {
      return
    }

    roles.value = roles.value.map((role) =>
      role.id === roleId
        ? {
            ...role,
            permissions: {
              ...role.permissions,
              [page]: allowed,
            },
          }
        : role,
    )
    await repository.saveRoles(roles.value)
  }

  async function deleteRole(roleId: string) {
    if (!canManageAccess.value || roles.value.length <= 1 || roleId === 'admin' || roleId === 'guest') {
      return false
    }

    if (users.value.some((user) => user.roleId === roleId)) {
      authError.value = 'Reassign users before deleting that role.'
      return false
    }

    roles.value = roles.value.filter((role) => role.id !== roleId)
    await repository.saveRoles(roles.value)
    return true
  }

  return {
    users,
    roles,
    session,
    isReady,
    authError,
    currentUser,
    currentRole,
    hasUsers,
    canManageAccess,
    accessiblePages,
    firstAccessiblePage,
    initialize,
    clearAuthError,
    canAccess,
    login,
    register,
    loginAsGuest,
    logout,
    updateUserRole,
    createRole,
    renameRole,
    setRolePermission,
    deleteRole,
  }
})
