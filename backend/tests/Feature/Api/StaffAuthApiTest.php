<?php

namespace Tests\Feature\Api;

use App\Models\Organization;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_admin_can_log_in_through_staff_session_api(): void
    {
        $this->seed();

        $this->postJson('/api/staff-sessions', [
            'organizationSlug' => 'demo-coffee',
            'storeCode' => 'main',
            'username' => 'admin',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('user.username', 'admin')
            ->assertJsonPath('user.roleId', 'admin')
            ->assertJsonPath('session.authSource', 'remote');
    }

    public function test_register_creates_a_remote_staff_account_for_the_store(): void
    {
        $this->seed();

        $response = $this->postJson('/api/staff-register', [
            'organizationSlug' => 'demo-coffee',
            'storeCode' => 'main',
            'fullName' => 'Cashier One',
            'username' => 'cashier1',
            'password' => 'secret',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'username' => 'cashier1',
            'name' => 'Cashier One',
        ]);

        $userId = $response->json('user.id');
        $organization = Organization::query()->where('slug', 'demo-coffee')->firstOrFail();
        $store = Store::query()->where('organization_id', $organization->id)->where('code', 'main')->firstOrFail();

        $this->assertDatabaseHas('organization_memberships', [
            'organization_id' => $organization->id,
            'user_id' => $userId,
        ]);

        $this->assertDatabaseHas('store_memberships', [
            'store_id' => $store->id,
            'user_id' => $userId,
        ]);
    }
}
