<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\PosRole;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreMembership;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

function permissionsFor(array $allowedPages): array
{
    $pages = ['register', 'orders', 'products', 'analytics', 'settings', 'diagnostics'];

    $permissions = [];
    foreach ($pages as $page) {
        $permissions[$page] = in_array($page, $allowedPages, true);
    }

    return $permissions;
}

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $organization = Organization::query()->firstOrCreate(
            ['slug' => 'demo-coffee'],
            [
                'name' => 'Demo Coffee Group',
                'status' => 'active',
            ],
        );

        $store = Store::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'code' => 'main',
            ],
            [
                'name' => 'Main Branch',
                'timezone' => 'Asia/Manila',
                'currency_code' => 'PHP',
                'status' => 'active',
                'pairing_code_hash' => Hash::make('123456'),
            ],
        );

        $admin = User::query()->firstOrCreate([
            'email' => 'admin@example.com',
        ], [
            'name' => 'Admin User',
            'username' => 'admin',
            'password' => Hash::make('password'),
            'status' => 'active',
        ]);

        OrganizationMembership::query()->firstOrCreate([
            'organization_id' => $organization->id,
            'user_id' => $admin->id,
        ], [
            'membership_role' => 'admin',
        ]);

        StoreMembership::query()->firstOrCreate([
            'store_id' => $store->id,
            'user_id' => $admin->id,
        ], [
            'membership_role' => 'admin',
        ]);

        $roles = [
            'admin' => ['name' => 'Admin', 'permissions' => permissionsFor(['register', 'orders', 'products', 'analytics', 'settings', 'diagnostics'])],
            'manager' => ['name' => 'Manager', 'permissions' => permissionsFor(['register', 'orders', 'products', 'analytics', 'settings'])],
            'cashier' => ['name' => 'Cashier', 'permissions' => permissionsFor(['register', 'orders'])],
            'guest' => ['name' => 'Guest', 'permissions' => permissionsFor(['register', 'orders', 'products', 'analytics', 'settings'])],
        ];

        foreach ($roles as $roleKey => $roleData) {
            PosRole::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'role_key' => $roleKey,
                ],
                [
                    'name' => $roleData['name'],
                    'permissions' => $roleData['permissions'],
                ],
            );
        }

        $beverages = Category::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'name' => 'Beverages',
            ],
            [
                'sort_order' => 1,
            ],
        );

        Product::query()->firstOrCreate(
            [
                'organization_id' => $organization->id,
                'sku' => 'ESP-0001',
            ],
            [
                'category_id' => $beverages->id,
                'barcode' => '100000000001',
                'name' => 'Espresso',
                'product_type' => 'standard',
                'tax_rate' => 12,
                'price_cents' => 12000,
                'track_inventory' => true,
                'is_active' => true,
            ],
        );
    }
}
