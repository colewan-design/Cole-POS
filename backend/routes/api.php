<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DeviceSessionController;
use App\Http\Controllers\Api\StaffRoleController;
use App\Http\Controllers\Api\StaffSessionController;
use App\Http\Controllers\Api\StaffUserController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\SyncController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/device-sessions', [DeviceSessionController::class, 'store']);
Route::post('/staff-sessions', [StaffSessionController::class, 'store']);
Route::post('/staff-register', [StaffSessionController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/sync/bootstrap', [SyncController::class, 'bootstrap']);
    Route::post('/sync/push', [SyncController::class, 'push']);
    Route::get('/sync/pull', [SyncController::class, 'pull']);
    Route::get('/shifts/current', [ShiftController::class, 'current']);
    Route::post('/shifts/open', [ShiftController::class, 'open']);
    Route::post('/shifts/current/movements', [ShiftController::class, 'addMovement']);
    Route::post('/shifts/current/close', [ShiftController::class, 'close']);
    Route::get('/staff-roles', [StaffRoleController::class, 'index']);
    Route::put('/staff-roles', [StaffRoleController::class, 'sync']);
    Route::get('/staff-users', [StaffUserController::class, 'index']);
    Route::patch('/staff-users/{user}/role', [StaffUserController::class, 'updateRole']);
});
