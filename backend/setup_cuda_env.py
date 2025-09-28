"""
CUDA Environment Setup for VibeVoice on Windows
This script sets up the necessary environment variables for CUDA/DeepSpeed to work properly.
"""

import os
import sys

def setup_cuda_environment():
    """Setup CUDA environment variables for optimal VibeVoice performance"""
    
    # CUDA paths
    cuda_home = "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v13.0"
    cuda_bin = os.path.join(cuda_home, "bin")
    cuda_lib = os.path.join(cuda_home, "lib", "x64")
    cuda_include = os.path.join(cuda_home, "include")
    
    # Set environment variables
    os.environ["CUDA_HOME"] = cuda_home
    os.environ["CUDA_PATH"] = cuda_home
    os.environ["CUDA_ROOT"] = cuda_home
    
    # Add to PATH if not already there
    current_path = os.environ.get("PATH", "")
    if cuda_bin not in current_path:
        os.environ["PATH"] = f"{cuda_bin};{current_path}"
    
    # DeepSpeed optimizations
    os.environ["DS_SKIP_CUDA_CHECK"] = "0"  # Enable CUDA checks now that we have NVCC
    os.environ["DS_BUILD_OPS"] = "1"       # Enable building optimized ops
    os.environ["DS_BUILD_CUTLASS_OPS"] = "1"  # Enable CUTLASS optimizations
    
    # PyTorch CUDA settings
    os.environ["TORCH_CUDA_ARCH_LIST"] = "8.9"  # RTX 5090 architecture
    os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:512"  # Optimize memory allocation
    
    # Disable problematic features on Windows
    os.environ["DS_BUILD_AIO"] = "0"      # Async I/O not supported on Windows
    os.environ["DS_BUILD_GDS"] = "0"      # GPU Direct Storage not supported on Windows
    
    print("[OK] CUDA environment configured:")
    print(f"   CUDA_HOME: {cuda_home}")
    print(f"   NVCC available: {os.path.exists(os.path.join(cuda_bin, 'nvcc.exe'))}")
    print(f"   GPU Architecture: {os.environ.get('TORCH_CUDA_ARCH_LIST')}")
    
    # Verify PyTorch CUDA
    try:
        import torch
        print(f"   PyTorch CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
            print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    except ImportError:
        print("   PyTorch not available for verification")

if __name__ == "__main__":
    setup_cuda_environment()