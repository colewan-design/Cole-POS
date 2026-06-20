<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Shift extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'id',
        'organization_id',
        'store_id',
        'device_id',
        'opened_by_user_id',
        'closed_by_user_id',
        'opening_cash_cents',
        'closing_cash_cents',
        'expected_cash_cents',
        'variance_cash_cents',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function cashMovements()
    {
        return $this->hasMany(CashMovement::class);
    }
}
