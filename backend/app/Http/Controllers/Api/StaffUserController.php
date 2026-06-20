<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\OrganizationMembership;
use App\Models\PosRole;
use App\Models\StoreMembership;
use App\Models\User;
use Illuminate\Http\Request;

class StaffUserController extends Controller
{
    public function index(Request $request)
    {
        $device = $this->deviceFromRequest($request);

        $storeMembers = StoreMembership::query()
            ->where('store_id', $device->store_id)
            ->pluck('membership_role', 'user_id');

        $users = User::query()
            ->whereIn('id', $storeMembers->keys())
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'fullName' => $user->name,
                'username' => $user->username,
                'passwordHash' => '',
                'roleId' => $storeMembers[$user->id] ?? 'cashier',
                'createdAt' => $user->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ]);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        $device = $this->deviceFromRequest($request);
        $validated = $request->validate([
            'roleId' => ['required', 'string'],
        ]);

        $roleExists = PosRole::query()
            ->where('organization_id', $device->organization_id)
            ->where('role_key', $validated['roleId'])
            ->whereNull('deleted_at')
            ->exists();

        abort_unless($roleExists, 422, 'Unknown role.');

        $organizationMembership = OrganizationMembership::query()
            ->where('organization_id', $device->organization_id)
            ->where('user_id', $user->id)
            ->first();

        if (! $organizationMembership) {
            abort(404, 'User is not part of this organization.');
        }

        $organizationMembership->forceFill([
            'membership_role' => $validated['roleId'],
        ])->save();

        StoreMembership::query()->updateOrCreate(
            [
                'store_id' => $device->store_id,
                'user_id' => $user->id,
            ],
            [
                'membership_role' => $validated['roleId'],
            ],
        );

        return response()->json([
            'user' => [
                'id' => $user->id,
                'fullName' => $user->name,
                'username' => $user->username,
                'passwordHash' => '',
                'roleId' => $validated['roleId'],
                'createdAt' => $user->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ],
        ]);
    }

    private function deviceFromRequest(Request $request): Device
    {
        $device = $request->user();
        abort_unless($device instanceof Device, 403, 'Authenticated device required.');

        return $device;
    }
}
