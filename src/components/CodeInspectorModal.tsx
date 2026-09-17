import React, { useState } from 'react';
import { VehicleTelemetry } from '../types';
import { X, Copy, Check, FileCode, Cpu, Layers } from 'lucide-react';

interface CodeInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: VehicleTelemetry;
  savedBestLapTime: number;
}

const FILE_HEADER_CPP = `#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "InputActionValue.h"
#include "UE5VehicleGameCar.generated.h"

UCLASS()
class MONPROJETCOURSE_API AUE5VehicleGameCar : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	AUE5VehicleGameCar();

protected:
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	// --- INPUTS ---
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Racing|Input")
	class UInputMappingContext* DefaultMappingContext;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Racing|Input")
	class UInputAction* SteeringAction;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Racing|Input")
	class UInputAction* ThrottleBrakeAction;

	void SteeringInput(const FInputActionValue& Value);
	void ThrottleBrakeInput(const FInputActionValue& Value);

	// --- DÉGÂTS ET COLLISIONS ---
	UFUNCTION()
	void OnVehicleHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit);

public:
	// --- LOGIQUE DE COURSE ---
	UPROPERTY(BlueprintReadWrite, Category = "Racing|Logic")
	float CurrentLapTime = 0.0f;

	UPROPERTY(BlueprintReadWrite, Category = "Racing|Logic")
	float BestLapTime = 0.0f;

	UPROPERTY(BlueprintReadWrite, Category = "Racing|Logic")
	int32 CurrentLap = 1;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Racing|Logic")
	int32 TotalLaps = 3;

	UPROPERTY(BlueprintReadWrite, Category = "Racing|Logic")
	bool bIsRaceActive = true;

	UPROPERTY(BlueprintReadWrite, Category = "Racing|Logic")
	int32 CurrentCheckpointIndex = 0;

	// --- PIÈCES DÉTACHABLES ---
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Racing|Parts")
	UStaticMeshComponent* FrontBumperMesh;
};`;

const FILE_SOURCE_CPP = `#include "UE5VehicleGameCar.h"
#include "ChaosVehicleMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"

AUE5VehicleGameCar::AUE5VehicleGameCar()
{
	PrimaryActorTick.bCanEverTick = true;

	// Composant pare-chocs détachable
	FrontBumperMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FrontBumperMesh"));
	FrontBumperMesh->SetupAttachment(GetMesh(), FName("Socket_FrontBumper"));

	GetMesh()->SetNotifyRigidBodyCollision(true);
}

void AUE5VehicleGameCar::BeginPlay()
{
	Super::BeginPlay();

	GetMesh()->OnComponentHit.AddDynamic(this, &AUE5VehicleGameCar::OnVehicleHit);

	if (APlayerController* PC = Cast<APlayerController>(GetController()))
	{
		if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			if (DefaultMappingContext)
			{
				Subsystem->AddMappingContext(DefaultMappingContext, 0);
			}
		}
	}
}

void AUE5VehicleGameCar::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	if (bIsRaceActive)
	{
		CurrentLapTime += DeltaTime;
	}
}

void AUE5VehicleGameCar::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EnhancedInputComp = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (SteeringAction)
		{
			EnhancedInputComp->BindAction(SteeringAction, ETriggerEvent::Triggered, this, &AUE5VehicleGameCar::SteeringInput);
		}
		if (ThrottleBrakeAction)
		{
			EnhancedInputComp->BindAction(ThrottleBrakeAction, ETriggerEvent::Triggered, this, &AUE5VehicleGameCar::ThrottleBrakeInput);
		}
	}
}

void AUE5VehicleGameCar::SteeringInput(const FInputActionValue& Value)
{
	GetVehicleMovementComponent()->SetSteeringInput(Value.Get<float>());
}

void AUE5VehicleGameCar::ThrottleBrakeInput(const FInputActionValue& Value)
{
	float InputVal = Value.Get<float>();
	if (InputVal >= 0.0f)
	{
		GetVehicleMovementComponent()->SetThrottleInput(InputVal);
		GetVehicleMovementComponent()->SetBrakeInput(0.0f);
	}
	else
	{
		GetVehicleMovementComponent()->SetThrottleInput(0.0f);
		GetVehicleMovementComponent()->SetBrakeInput(FMath::Abs(InputVal));
	}
}

void AUE5VehicleGameCar::OnVehicleHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit)
{
	if (NormalImpulse.Size() > 80000.0f && FrontBumperMesh)
	{
		FrontBumperMesh->DetachFromComponent(FDetachmentTransformRules::KeepWorldTransform);
		FrontBumperMesh->SetSimulatePhysics(true);
		FrontBumperMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
		FrontBumperMesh->SetLifeSpan(15.0f);
	}
}`;

const FILE_SAVEGAME_H = `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "RaceSaveGame.generated.h"

UCLASS()
class MONPROJETCOURSE_API URaceSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "SaveData")
	float SavedBestLapTime = 0.0f;
};`;

export const CodeInspectorModal: React.FC<CodeInspectorModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  savedBestLapTime,
}) => {
  const [activeTab, setActiveTab] = useState<'header' | 'source' | 'savegame' | 'architecture'>('header');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode =
    activeTab === 'header'
      ? FILE_HEADER_CPP
      : activeTab === 'source'
      ? FILE_SOURCE_CPP
      : activeTab === 'savegame'
      ? FILE_SAVEGAME_H
      : '';

  const handleCopy = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Unreal Engine 5 C++ Architecture</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  AWheeledVehiclePawn
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Source code and live reflection parameters running inside the simulator.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('header')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                activeTab === 'header'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              UE5VehicleGameCar.h
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                activeTab === 'source'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              UE5VehicleGameCar.cpp
            </button>
            <button
              onClick={() => setActiveTab('savegame')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                activeTab === 'savegame'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RaceSaveGame.h
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors ${
                activeTab === 'architecture'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Live State Inspector</span>
              </span>
            </button>
          </div>

          {activeTab !== 'architecture' && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed">
          {activeTab === 'architecture' ? (
            <div className="space-y-6 font-sans">
              {/* Real-time C++ Variable Reflection Box */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Real-time C++ UPROPERTY Reflection</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">float CurrentLapTime</div>
                    <div className="text-base font-bold text-sky-300">{telemetry.currentLapTime.toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">float BestLapTime</div>
                    <div className="text-base font-bold text-amber-300">{telemetry.bestLapTime.toFixed(3)}s</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">int32 CurrentLap</div>
                    <div className="text-base font-bold text-white">{telemetry.currentLap} / {telemetry.totalLaps}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">bool bIsRaceActive</div>
                    <div className="text-base font-bold text-emerald-400">{telemetry.bIsRaceActive ? 'true' : 'false'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">int32 CurrentCheckpointIndex</div>
                    <div className="text-base font-bold text-indigo-300">{telemetry.currentCheckpointIndex}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                    <div className="text-slate-400 text-[10px]">URaceSaveGame::SavedBestLapTime</div>
                    <div className="text-base font-bold text-emerald-300">{savedBestLapTime.toFixed(3)}s</div>
                  </div>
                </div>
              </div>

              {/* Detachable Bumper State */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                  FrontBumperMesh & OnVehicleHit Implementation
                </h4>
                <div className="text-xs text-slate-300 space-y-2">
                  <p>
                    • <strong>Attachment:</strong> <code className="text-sky-300">FrontBumperMesh-&gt;SetupAttachment(GetMesh(), FName("Socket_FrontBumper"));</code>
                  </p>
                  <p>
                    • <strong>Hit Handler:</strong> <code className="text-amber-300">if (NormalImpulse.Size() &gt; 80000.0f && FrontBumperMesh)</code>
                  </p>
                  <p>
                    • <strong>Current Status:</strong>{' '}
                    <span className={telemetry.isBumperAttached ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {telemetry.isBumperAttached ? 'Attached to Socket' : `Detached in World (${telemetry.bumperLifespanRemaining}s remaining)`}
                    </span>
                  </p>
                  <p>
                    • <strong>Last Collision Impulse:</strong>{' '}
                    <span className="font-mono text-white">{telemetry.lastImpulseSize.toLocaleString()} Ns</span> (Threshold: 80,000 Ns)
                  </p>
                </div>
              </div>

              {/* Enhanced Input System */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                  UEnhancedInputComponent & ChaosVehicleMovementComponent
                </h4>
                <div className="text-xs text-slate-300 space-y-2">
                  <p>
                    • <strong>SteeringAction:</strong> Transferred to <code className="text-sky-300">GetVehicleMovementComponent()-&gt;SetSteeringInput(Value.Get&lt;float&gt;())</code>
                  </p>
                  <p>
                    • <strong>ThrottleBrakeAction:</strong> If <code className="text-emerald-300">InputVal &gt;= 0.0f</code>, sets Throttle. If negative, sets Brake to <code className="text-rose-300">FMath::Abs(InputVal)</code>.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <pre className="text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">
              {currentCode}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
