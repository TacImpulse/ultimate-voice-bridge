#!/usr/bin/env python3
"""
RTX 5090 GPU Acceleration Setup Script
Ultimate Voice Bridge - Automated GPU Setup and Validation
"""

import sys
import os
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RTX5090SetupManager:
    """Automated setup and validation for RTX 5090 GPU acceleration"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.requirements_file = self.project_root / "requirements_gpu.txt"
        self.env_file = self.project_root / ".env"
        self.setup_status = {
            "cuda_available": False,
            "onnxruntime_gpu_available": False,
            "pytorch_gpu_available": False,
            "rtx5090_detected": False,
            "dependencies_installed": False,
            "configuration_updated": False,
            "benchmarks_passed": False
        }
    
    async def run_complete_setup(self) -> Dict[str, any]:
        """Run the complete RTX 5090 setup process"""
        logger.info("🚀 Starting RTX 5090 GPU Acceleration Setup")
        logger.info("=" * 60)
        
        try:
            # Step 1: System Requirements Check
            logger.info("📋 Step 1: Checking system requirements...")
            await self._check_system_requirements()
            
            # Step 2: GPU Detection and Validation
            logger.info("🔍 Step 2: Detecting and validating RTX 5090...")
            await self._detect_and_validate_gpu()
            
            # Step 3: Install Dependencies
            logger.info("📦 Step 3: Installing GPU acceleration dependencies...")
            await self._install_gpu_dependencies()
            
            # Step 4: Configure Environment
            logger.info("⚙️ Step 4: Configuring environment variables...")
            await self._configure_environment()
            
            # Step 5: Validate Installation
            logger.info("✅ Step 5: Validating GPU acceleration setup...")
            await self._validate_gpu_acceleration()
            
            # Step 6: Run Performance Benchmarks
            logger.info("📊 Step 6: Running performance benchmarks...")
            await self._run_performance_benchmarks()
            
            # Step 7: Generate Setup Report
            logger.info("📄 Step 7: Generating setup report...")
            setup_report = await self._generate_setup_report()
            
            logger.info("✅ RTX 5090 GPU Acceleration Setup Completed!")
            return setup_report
            
        except Exception as e:
            logger.error(f"❌ Setup failed: {e}")
            return {"status": "failed", "error": str(e), "setup_status": self.setup_status}
    
    async def _check_system_requirements(self):
        """Check system requirements for RTX 5090 acceleration"""
        logger.info("Checking Python version...")
        python_version = sys.version_info
        if python_version < (3, 8):
            raise RuntimeError(f"Python 3.8+ required, found {python_version}")
        logger.info(f"✓ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # Check CUDA installation
        logger.info("Checking CUDA installation...")
        try:
            result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("✓ NVIDIA drivers detected")
                if "RTX 5090" in result.stdout:
                    logger.info("✓ RTX 5090 GPU detected!")
                    self.setup_status["rtx5090_detected"] = True
                else:
                    logger.warning("⚠️ RTX 5090 not specifically detected, but NVIDIA GPU found")
            else:
                logger.warning("⚠️ nvidia-smi not found - CUDA may not be installed")
        except FileNotFoundError:
            logger.warning("⚠️ nvidia-smi not found - NVIDIA drivers may not be installed")
        
        # Check available disk space
        logger.info("Checking disk space...")
        disk_usage = os.statvfs(self.project_root)
        free_gb = (disk_usage.f_bavail * disk_usage.f_frsize) / (1024**3)
        
        if free_gb < 10:
            raise RuntimeError(f"Insufficient disk space: {free_gb:.1f}GB free, need at least 10GB")
        logger.info(f"✓ Sufficient disk space: {free_gb:.1f}GB available")
        
        # Check memory
        try:
            import psutil
            memory = psutil.virtual_memory()
            memory_gb = memory.total / (1024**3)
            
            if memory_gb < 16:
                logger.warning(f"⚠️ Limited RAM: {memory_gb:.1f}GB (16GB+ recommended)")
            else:
                logger.info(f"✓ Sufficient RAM: {memory_gb:.1f}GB")
        except ImportError:
            logger.info("ℹ️ psutil not available for memory check")
    
    async def _detect_and_validate_gpu(self):
        """Detect and validate RTX 5090 GPU"""
        try:
            # Try importing torch to check CUDA
            import torch
            
            if torch.cuda.is_available():
                self.setup_status["cuda_available"] = True
                gpu_count = torch.cuda.device_count()
                gpu_name = torch.cuda.get_device_name(0)
                
                logger.info(f"✓ CUDA available with {gpu_count} GPU(s)")
                logger.info(f"✓ Primary GPU: {gpu_name}")
                
                # Check compute capability
                props = torch.cuda.get_device_properties(0)
                compute_capability = f"{props.major}.{props.minor}"
                
                # RTX 5090 should have compute capability 8.9 or higher
                if props.major >= 8 and (props.major > 8 or props.minor >= 9):
                    logger.info(f"✓ Compute capability {compute_capability} (RTX 5090 compatible)")
                    self.setup_status["pytorch_gpu_available"] = True
                else:
                    logger.warning(f"⚠️ Compute capability {compute_capability} may not be optimal for RTX 5090")
                
                # Check memory
                memory_gb = props.total_memory / (1024**3)
                logger.info(f"✓ GPU memory: {memory_gb:.1f}GB")
                
                if "RTX 5090" in gpu_name:
                    self.setup_status["rtx5090_detected"] = True
                    logger.info("🎯 RTX 5090 specifically detected!")
            else:
                logger.warning("⚠️ CUDA not available in PyTorch")
                
        except ImportError:
            logger.info("ℹ️ PyTorch not yet installed - will install in next step")
    
    async def _install_gpu_dependencies(self):
        """Install GPU acceleration dependencies"""
        if not self.requirements_file.exists():
            logger.error(f"❌ Requirements file not found: {self.requirements_file}")
            return
        
        logger.info(f"Installing dependencies from {self.requirements_file}...")
        
        # Create pip install command
        cmd = [
            sys.executable, "-m", "pip", "install", 
            "-r", str(self.requirements_file),
            "--upgrade"
        ]
        
        try:
            # Install with progress tracking
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                universal_newlines=True
            )
            
            # Stream output
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    # Log important lines
                    if any(keyword in output.lower() for keyword in ['installing', 'successfully', 'error', 'failed']):
                        logger.info(f"📦 {output.strip()}")
            
            return_code = process.poll()
            
            if return_code == 0:
                logger.info("✅ Dependencies installed successfully!")
                self.setup_status["dependencies_installed"] = True
            else:
                logger.error(f"❌ Installation failed with code {return_code}")
                
        except Exception as e:
            logger.error(f"❌ Installation error: {e}")
    
    async def _configure_environment(self):
        """Configure environment variables for RTX 5090 acceleration"""
        env_config = {
            # GPU Acceleration
            "GPU_ACCELERATION_ENABLED": "true",
            "GPU_DEVICE_ID": "0",
            "GPU_MEMORY_FRACTION": "0.8",
            "GPU_ALLOW_GROWTH": "true",
            
            # ONNX Runtime
            "ONNX_OPTIMIZATION_LEVEL": "all",
            "ONNX_INTRA_OP_NUM_THREADS": "0",
            "ONNX_INTER_OP_NUM_THREADS": "0",
            "ONNX_ENABLE_PROFILING": "false",
            
            # Model Caching
            "ONNX_MODEL_CACHE_DIR": "./models/onnx_cache",
            "ONNX_MODEL_CACHE_SIZE_MB": "2048",
            
            # Batch Processing (RTX 5090 optimized)
            "DEFAULT_BATCH_SIZE": "16",
            "MAX_BATCH_SIZE": "64",
            "BATCH_TIMEOUT_MS": "100",
            
            # Performance Monitoring
            "ENABLE_GPU_MONITORING": "true",
            "PERFORMANCE_LOGGING": "true",
            "BENCHMARK_MODE": "false",
            
            # CUDA Environment
            "CUDA_VISIBLE_DEVICES": "0",
            "CUDA_LAUNCH_BLOCKING": "0",
        }
        
        logger.info(f"Configuring environment variables in {self.env_file}...")
        
        # Read existing .env file if it exists
        existing_vars = {}
        if self.env_file.exists():
            try:
                with open(self.env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            existing_vars[key.strip()] = value.strip()
            except Exception as e:
                logger.warning(f"Could not read existing .env file: {e}")
        
        # Update with GPU acceleration settings
        existing_vars.update(env_config)
        
        # Write updated .env file
        try:
            with open(self.env_file, 'w') as f:
                f.write("# Ultimate Voice Bridge Configuration\\n")
                f.write("# RTX 5090 GPU Acceleration Settings\\n\\n")
                
                for key, value in existing_vars.items():
                    f.write(f"{key}={value}\\n")
            
            logger.info("✅ Environment configuration updated!")
            self.setup_status["configuration_updated"] = True
            
        except Exception as e:
            logger.error(f"❌ Failed to update environment configuration: {e}")
    
    async def _validate_gpu_acceleration(self):
        """Validate that GPU acceleration is working"""
        logger.info("Validating GPU acceleration components...")
        
        validation_results = {
            "torch_cuda": False,
            "onnxruntime_gpu": False,
            "acceleration_service": False
        }
        
        try:
            # Test PyTorch CUDA
            import torch
            if torch.cuda.is_available():
                test_tensor = torch.randn(100, 100, device='cuda')
                result = torch.matmul(test_tensor, test_tensor.T)
                validation_results["torch_cuda"] = True
                logger.info("✅ PyTorch CUDA validation passed")
            else:
                logger.warning("⚠️ PyTorch CUDA not available")
            
        except Exception as e:
            logger.warning(f"⚠️ PyTorch CUDA validation failed: {e}")
        
        try:
            # Test ONNX Runtime GPU
            import onnxruntime as ort
            providers = ort.get_available_providers()
            if 'CUDAExecutionProvider' in providers:
                validation_results["onnxruntime_gpu"] = True
                self.setup_status["onnxruntime_gpu_available"] = True
                logger.info("✅ ONNX Runtime CUDA provider available")
            else:
                logger.warning("⚠️ ONNX Runtime CUDA provider not available")
                logger.info(f"Available providers: {providers}")
            
        except Exception as e:
            logger.warning(f"⚠️ ONNX Runtime validation failed: {e}")
        
        try:
            # Test our acceleration service
            sys.path.append(str(self.project_root))
            from services.onnx_acceleration_service import ONNXAccelerationService
            
            service = ONNXAccelerationService()
            await service.initialize()
            
            if service.device_info and service.device_info.get("cuda_available"):
                validation_results["acceleration_service"] = True
                logger.info("✅ ONNX Acceleration Service validated")
            else:
                logger.warning("⚠️ ONNX Acceleration Service validation failed")
            
            await service.cleanup()
            
        except Exception as e:
            logger.warning(f"⚠️ Acceleration service validation failed: {e}")
        
        # Overall validation status
        all_valid = all(validation_results.values())
        if all_valid:
            logger.info("🎉 All GPU acceleration components validated!")
        else:
            failed_components = [k for k, v in validation_results.items() if not v]
            logger.warning(f"⚠️ Some components failed validation: {failed_components}")
    
    async def _run_performance_benchmarks(self):
        """Run basic performance benchmarks"""
        logger.info("Running performance benchmarks...")
        
        try:
            # Import benchmark suite
            sys.path.append(str(self.project_root / "tests"))
            from test_rtx5090_acceleration import RTX5090BenchmarkSuite
            
            benchmark_suite = RTX5090BenchmarkSuite()
            
            # Run lightweight benchmark
            logger.info("Running RTX 5090 benchmark suite...")
            results = await benchmark_suite.run_full_benchmark_suite()
            
            if "error" not in results:
                summary = results.get("summary", {})
                performance_score = summary.get("rtx5090_performance_score", 0)
                
                if performance_score >= 60:
                    logger.info(f"✅ Benchmarks passed! Performance score: {performance_score}/100")
                    self.setup_status["benchmarks_passed"] = True
                else:
                    logger.warning(f"⚠️ Benchmarks show suboptimal performance: {performance_score}/100")
                    
                logger.info(f"GPU effectiveness: {summary.get('acceleration_effectiveness', 'unknown')}")
            else:
                logger.warning(f"⚠️ Benchmark failed: {results['error']}")
            
            benchmark_suite.cleanup()
            
        except Exception as e:
            logger.warning(f"⚠️ Could not run benchmarks: {e}")
    
    async def _generate_setup_report(self) -> Dict[str, any]:
        """Generate comprehensive setup report"""
        report = {
            "timestamp": asyncio.get_event_loop().time(),
            "setup_status": self.setup_status,
            "summary": {},
            "recommendations": [],
            "next_steps": []
        }
        
        # Calculate setup completion percentage
        total_steps = len(self.setup_status)
        completed_steps = sum(1 for status in self.setup_status.values() if status)
        completion_percentage = (completed_steps / total_steps) * 100
        
        report["summary"] = {
            "completion_percentage": round(completion_percentage, 1),
            "setup_successful": completion_percentage >= 80,
            "critical_components_ready": (
                self.setup_status["cuda_available"] and
                self.setup_status["onnxruntime_gpu_available"] and
                self.setup_status["dependencies_installed"]
            )
        }
        
        # Generate recommendations
        if not self.setup_status["rtx5090_detected"]:
            report["recommendations"].append("RTX 5090 not specifically detected - verify GPU model")
        
        if not self.setup_status["cuda_available"]:
            report["recommendations"].append("CUDA not available - check NVIDIA driver installation")
        
        if not self.setup_status["onnxruntime_gpu_available"]:
            report["recommendations"].append("ONNX Runtime GPU provider not available - check CUDA toolkit")
        
        if not self.setup_status["benchmarks_passed"]:
            report["recommendations"].append("Performance benchmarks indicate suboptimal setup - consider tuning")
        
        if completion_percentage >= 90:
            report["recommendations"].append("Setup is excellent! RTX 5090 acceleration is ready for production")
        elif completion_percentage >= 70:
            report["recommendations"].append("Setup is good with minor issues - RTX 5090 acceleration should work")
        else:
            report["recommendations"].append("Setup has significant issues - manual intervention may be required")
        
        # Next steps
        if report["summary"]["setup_successful"]:
            report["next_steps"] = [
                "Test voice generation with GPU acceleration enabled",
                "Monitor GPU utilization during voice processing",
                "Fine-tune batch sizes for your specific workload",
                "Set up production monitoring and alerts"
            ]
        else:
            report["next_steps"] = [
                "Address setup issues identified in recommendations",
                "Consult RTX 5090 documentation for troubleshooting",
                "Consider running setup script again after fixes",
                "Test individual components manually"
            ]
        
        return report


async def main():
    """Main setup function"""
    try:
        setup_manager = RTX5090SetupManager()
        report = await setup_manager.run_complete_setup()
        
        print("\\n" + "="*60)
        print("🎯 RTX 5090 GPU ACCELERATION SETUP REPORT")
        print("="*60)
        
        summary = report.get("summary", {})
        print(f"Setup Completion: {summary.get('completion_percentage', 0)}%")
        print(f"Setup Successful: {'✅' if summary.get('setup_successful') else '❌'}")
        print(f"Critical Components Ready: {'✅' if summary.get('critical_components_ready') else '❌'}")
        
        print("\\n📋 Component Status:")
        for component, status in report["setup_status"].items():
            status_icon = "✅" if status else "❌"
            component_name = component.replace("_", " ").title()
            print(f"  {status_icon} {component_name}")
        
        if report["recommendations"]:
            print("\\n💡 Recommendations:")
            for rec in report["recommendations"]:
                print(f"  • {rec}")
        
        if report["next_steps"]:
            print("\\n🚀 Next Steps:")
            for step in report["next_steps"]:
                print(f"  • {step}")
        
        print("\\n" + "="*60)
        
        # Save detailed report
        report_file = Path("rtx5090_setup_report.json")
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📄 Detailed report saved to: {report_file}")
        
        return 0 if summary.get("setup_successful", False) else 1
        
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)