<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryLevel extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'store_id',
        'product_id',
        'qty_on_hand',
        'reorder_level',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'qty_on_hand' => 'decimal:3',
            'reorder_level' => 'decimal:3',
            'updated_at' => 'datetime',
        ];
    }
}
