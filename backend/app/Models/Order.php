<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'id',
        'organization_id',
        'store_id',
        'device_id',
        'user_id',
        'ticket_number',
        'order_status',
        'order_type',
        'payment_status',
        'subtotal_cents',
        'tax_cents',
        'total_cents',
        'business_date',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'business_date' => 'date',
            'completed_at' => 'datetime',
        ];
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function device()
    {
        return $this->belongsTo(Device::class);
    }
}
