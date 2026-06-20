<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreMembership extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'store_id',
        'user_id',
        'membership_role',
    ];
}
