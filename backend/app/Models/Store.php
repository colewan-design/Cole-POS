<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'timezone',
        'currency_code',
        'status',
        'pairing_code_hash',
    ];

    protected $hidden = [
        'pairing_code_hash',
    ];

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function overrides()
    {
        return $this->hasMany(ProductStoreOverride::class);
    }

    public function inventoryLevels()
    {
        return $this->hasMany(InventoryLevel::class);
    }
}
