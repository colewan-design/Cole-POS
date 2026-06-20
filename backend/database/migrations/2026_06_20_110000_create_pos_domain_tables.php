<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->string('timezone')->default('Asia/Manila');
            $table->char('currency_code', 3)->default('PHP');
            $table->string('status')->default('active');
            $table->string('pairing_code_hash')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['organization_id', 'code']);
        });

        Schema::create('organization_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('membership_role');
            $table->timestamps();
            $table->unique(['organization_id', 'user_id']);
        });

        Schema::create('store_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('membership_role');
            $table->timestamps();
            $table->unique(['store_id', 'user_id']);
        });

        Schema::create('devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->string('device_name');
            $table->string('platform');
            $table->string('app_version')->nullable();
            $table->string('status')->default('active');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->foreignUuid('created_by_device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable();
            $table->string('name');
            $table->string('product_type')->default('standard');
            $table->decimal('tax_rate', 5, 2)->default(12.00);
            $table->integer('price_cents');
            $table->boolean('track_inventory')->default(true);
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by_device_id')->nullable()->constrained('devices')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['organization_id', 'sku']);
            $table->unique(['organization_id', 'barcode']);
        });

        Schema::create('product_store_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->integer('price_cents')->nullable();
            $table->boolean('is_available')->nullable();
            $table->string('display_name')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['store_id', 'product_id']);
        });

        Schema::create('inventory_levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('qty_on_hand', 12, 3)->default(0);
            $table->decimal('reorder_level', 12, 3)->nullable();
            $table->timestamp('updated_at')->useCurrent();
            $table->softDeletes();
            $table->unique(['store_id', 'product_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('device_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('ticket_number');
            $table->string('order_status')->default('completed');
            $table->string('order_type');
            $table->string('payment_status')->default('paid');
            $table->integer('subtotal_cents');
            $table->integer('tax_cents');
            $table->integer('total_cents');
            $table->date('business_date');
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['store_id', 'ticket_number']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->decimal('quantity', 12, 3);
            $table->integer('unit_price_cents');
            $table->integer('line_total_cents');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained()->cascadeOnDelete();
            $table->string('payment_method');
            $table->integer('amount_cents');
            $table->integer('tendered_cents')->nullable();
            $table->integer('change_cents')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('sync_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('device_id')->constrained()->cascadeOnDelete();
            $table->string('entity_type');
            $table->uuid('entity_id');
            $table->string('operation');
            $table->json('payload');
            $table->string('idempotency_key')->unique();
            $table->timestamp('received_at')->useCurrent();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('error_message')->nullable();
        });

        Schema::create('sync_cursors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('device_id')->constrained()->cascadeOnDelete();
            $table->string('cursor_name');
            $table->text('cursor_value');
            $table->timestamp('updated_at')->useCurrent();
            $table->unique(['device_id', 'cursor_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_cursors');
        Schema::dropIfExists('sync_events');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('inventory_levels');
        Schema::dropIfExists('product_store_overrides');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('store_memberships');
        Schema::dropIfExists('organization_memberships');
        Schema::dropIfExists('stores');
        Schema::dropIfExists('organizations');
    }
};
