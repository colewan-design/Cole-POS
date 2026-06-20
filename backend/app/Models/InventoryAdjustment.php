<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryAdjustment extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'id',
        'organization_id',
        'store_id',
        'device_id',
        'product_id',
        'order_id',
        'adjustment_type',
        'quantity_delta',
        'reason',
        'created_at',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity_delta' => 'decimal:3',
            'created_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }
}
