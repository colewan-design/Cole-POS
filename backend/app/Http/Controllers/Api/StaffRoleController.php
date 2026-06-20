<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\PosRole;
use Illuminate\Http\Request;

class StaffRoleController extends Controller
{
    public function index(Request $request)
    {
        $device = $this->deviceFromRequest($request);

        $roles = PosRole::query()
            ->where('organization_id', $device->organization_id)
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get()
            ->map(fn (PosRole $role) => [
                'id' => $role->role_key,
                'name' => $role->name,
                'permissions' => $role->permissions,
            ]);

        return response()->json([
            'roles' => $roles,
        ]);
    }

    public function sync(Request $request)
    {
        $device = $this->deviceFromRequest($request);

        $validated = $request->validate([
            'roles' => ['required', 'array', 'min:1'],
            'roles.*.id' => ['required', 'string', 'max:80'],
            'roles.*.name' => ['required', 'string', 'max:120'],
            'roles.*.permissions' => ['required', 'array'],
        ]);

        $incomingRoleKeys = [];

        foreach ($validated['roles'] as $roleData) {
            $incomingRoleKeys[] = $roleData['id'];

            PosRole::query()->updateOrCreate(
                [
                    'organization_id' => $device->organization_id,
                    'role_key' => $roleData['id'],
                ],
                [
                    'name' => $roleData['name'],
                    'permissions' => $roleData['permissions'],
                    'deleted_at' => null,
                ],
            );
        }

        PosRole::query()
            ->where('organization_id', $device->organization_id)
            ->whereNotIn('role_key', $incomingRoleKeys)
            ->whereNotIn('role_key', ['admin', 'guest'])
            ->whereNull('deleted_at')
            ->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

        return $this->index($request);
    }

    private function deviceFromRequest(Request $request): Device
    {
        $device = $request->user();
        abort_unless($device instanceof Device, 403, 'Authenticated device required.');

        return $device;
    }
}
