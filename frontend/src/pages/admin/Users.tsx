import { useEffect, useState } from "react"
import { AppShell } from "@/layouts/Sidebar"
import { PageHeader } from "@/layouts/PageHeader"
import { SearchInput, Select } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { RoleBadge } from "@/components/ui/Badge"
import { PageError, PageLoading } from "@/components/ui/PageState"
import { useCategories, useDepartments, useProfiles } from "@/hooks/useData"
import { supabase } from "@/lib/supabase"
import { formatDate, type Category, type Department, type Profile, type UserRole } from "@/lib/tickets"

type AssignmentRow = { developer_id: string; category_id: string }

export function AdminUsers() {
  const { profiles, loading, error, reload } = useProfiles()
  const { departments } = useDepartments()
  const { categories } = useCategories(true)
  const [search, setSearch] = useState("")
  const [message, setMessage] = useState("")
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  async function loadAssignments() {
    const { data, error: assignmentError } = await supabase
      .from("developer_categories")
      .select("developer_id,category_id")

    if (assignmentError) {
      setMessage(assignmentError.message)
      return
    }

    const next: Record<string, string[]> = {}
    for (const row of (data ?? []) as AssignmentRow[]) {
      next[row.developer_id] = [...(next[row.developer_id] ?? []), row.category_id]
    }
    setAssignments(next)
  }

  useEffect(() => {
    void loadAssignments()
  }, [])

  async function update(
    id: string,
    role: UserRole,
    departmentId: string | null,
    isActive: boolean,
    categoryIds: string[],
  ) {
    setMessage("")

    if (role === "developer" && !departmentId) {
      setMessage("Choose a department before granting the developer role.")
      return
    }

    if (role === "developer" && isActive && categoryIds.length === 0) {
      setMessage("Choose at least one ticket category for an active developer.")
      return
    }

    const { error: updateError } = await supabase.rpc("admin_update_user_access", {
      target_user_id: id,
      target_role: role,
      target_department_id: role === "developer" ? departmentId : null,
      target_is_active: isActive,
      target_category_ids: role === "developer" ? categoryIds : [],
    })

    if (updateError) {
      setMessage(updateError.message)
      return
    }

    await Promise.all([reload(), loadAssignments()])
    setMessage("User access updated successfully.")
  }

  if (loading) return <AppShell role="admin"><PageLoading /></AppShell>
  if (error) return <AppShell role="admin"><PageError message={error} /></AppShell>

  const rows = profiles.filter((profile) =>
    profile.full_name.toLowerCase().includes(search.toLowerCase())
    || profile.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AppShell role="admin">
      <div className="max-w-7xl px-8 py-8">
        <PageHeader title="Users" subtitle="Manage help desk users, departments, and developer ticket categories." />
        <SearchInput
          className="mb-5"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users..."
        />
        {message && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{message}</p>
        )}
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr>
                {['User', 'Role', 'Department', 'Ticket Categories', 'Status', 'Joined', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs uppercase text-[#aeaeb2]">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((profile) => (
                <UserRow
                  key={profile.id}
                  profile={profile}
                  departments={departments}
                  categories={categories}
                  assignedCategories={assignments[profile.id] ?? []}
                  save={update}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}

function UserRow({
  profile,
  departments,
  categories,
  assignedCategories,
  save,
}: {
  profile: Profile
  departments: Department[]
  categories: Category[]
  assignedCategories: string[]
  save: (
    id: string,
    role: UserRole,
    departmentId: string | null,
    isActive: boolean,
    categoryIds: string[],
  ) => Promise<void>
}) {
  const [role, setRole] = useState<UserRole>(profile.role)
  const [departmentId, setDepartmentId] = useState(profile.department_id ?? "")
  const [categoryIds, setCategoryIds] = useState<string[]>(assignedCategories)
  const [active, setActive] = useState(profile.is_active)
  const isAdmin = profile.role === "admin"

  useEffect(() => {
    setCategoryIds(assignedCategories)
  }, [assignedCategories])

  useEffect(() => {
    setRole(profile.role)
    setDepartmentId(profile.department_id ?? "")
    setActive(profile.is_active)
  }, [profile.role, profile.department_id, profile.is_active])

  const departmentCategories = categories.filter(
    (category) => category.department_id === departmentId && category.is_active,
  )

  function changeRole(next: UserRole) {
    setRole(next)
    if (next === "user") {
      setDepartmentId("")
      setCategoryIds([])
    }
  }

  function changeDepartment(nextDepartment: string) {
    setDepartmentId(nextDepartment)
    setCategoryIds([])
  }

  function changeCategories(event: React.ChangeEvent<HTMLSelectElement>) {
    setCategoryIds(Array.from(event.target.selectedOptions, (option) => option.value))
  }

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <p className="text-sm font-medium">{profile.full_name}</p>
        <p className="text-xs text-[#6e6e73]">{profile.email}</p>
      </td>
      <td className="px-4 py-3">
        <RoleBadge role={profile.role[0].toUpperCase() + profile.role.slice(1)} />
        {!isAdmin && (
          <Select className="mt-2" value={role} onChange={(event) => changeRole(event.target.value as UserRole)}>
            <option value="user">User</option>
            <option value="developer">Developer</option>
          </Select>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          disabled={isAdmin || role !== "developer"}
          value={departmentId}
          onChange={(event) => changeDepartment(event.target.value)}
        >
          <option value="">No department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>{department.name}</option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        {role === "developer" && !isAdmin ? (
          <>
            <select
              multiple
              size={Math.min(Math.max(departmentCategories.length, 2), 5)}
              value={categoryIds}
              onChange={changeCategories}
              disabled={!departmentId || !active}
              className="min-w-48 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-[#0071e3] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 disabled:bg-gray-50"
            >
              {departmentCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <p className="mt-1 max-w-56 text-[11px] text-[#6e6e73]">Use Ctrl/Cmd + click to select more than one category.</p>
          </>
        ) : (
          <span className="text-sm text-[#aeaeb2]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isAdmin ? (
          <span className="text-sm">Active</span>
        ) : (
          <Select value={active ? "active" : "inactive"} onChange={(event) => setActive(event.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        )}
      </td>
      <td className="px-4 py-3 text-sm">{formatDate(profile.created_at)}</td>
      <td className="px-4 py-3">
        {!isAdmin && (
          <Button
            size="sm"
            onClick={() => save(
              profile.id,
              role,
              role === "developer" ? departmentId || null : null,
              active,
              role === "developer" && active ? categoryIds : [],
            )}
          >
            Save
          </Button>
        )}
      </td>
    </tr>
  )
}
