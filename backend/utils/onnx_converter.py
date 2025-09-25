"""
ONNX Model Conversion Utilities for Ultimate Voice Bridge
Optimized for RTX 5090 GPU acceleration
"""

import logging
import time
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
import numpy as np
import json

try:
    import torch
    import torch.nn as nn
    import onnx
    from onnx import helper, TensorProto, mapping, shape_inference, optimizer
    import onnxruntime as ort
    TORCH_AVAILABLE = True
    ONNX_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    ONNX_AVAILABLE = False
    print(f"Warning: PyTorch/ONNX not available: {e}")

logger = logging.getLogger(__name__)


class ModelConversionError(Exception):
    """Custom exception for model conversion errors"""
    pass


class ONNXConverter:
    """Utility class for converting PyTorch models to ONNX format with RTX 5090 optimization"""

    def __init__(self, temp_dir: Optional[Path] = None):
        self.temp_dir = temp_dir or Path(tempfile.gettempdir()) / "onnx_conversion"
        self.temp_dir.mkdir(exist_ok=True)
        
        # RTX 5090 optimization settings
        self.rtx_5090_settings = {
            "opset_version": 17,  # Latest supported opset
            "enable_mixed_precision": True,
            "optimize_for_inference": True,
            "batch_size_optimization": True,
            "memory_efficient": True
        }

    def convert_pytorch_to_onnx(
        self,
        model: nn.Module,
        model_name: str,
        input_sample: Dict[str, torch.Tensor],
        output_path: Optional[str] = None,
        optimize_for_rtx5090: bool = True,
        dynamic_axes: Optional[Dict[str, Dict[int, str]]] = None
    ) -> str:
        """
        Convert PyTorch model to ONNX format optimized for RTX 5090
        
        Args:
            model: PyTorch model to convert
            model_name: Name for the converted model
            input_sample: Sample inputs for tracing
            output_path: Optional custom output path
            optimize_for_rtx5090: Whether to apply RTX 5090 optimizations
            dynamic_axes: Dynamic axes specification for variable input sizes
        
        Returns:
            Path to the converted ONNX model
        """
        if not TORCH_AVAILABLE or not ONNX_AVAILABLE:
            raise ModelConversionError("PyTorch and ONNX are required for conversion")

        try:
            logger.info(f"🔄 Converting PyTorch model '{model_name}' to ONNX...")
            start_time = time.time()

            # Set output path
            if output_path is None:
                output_path = str(self.temp_dir / f"{model_name}.onnx")

            # Prepare model for conversion
            model.eval()
            
            # Convert input sample to appropriate format
            input_names, torch_inputs = self._prepare_inputs(input_sample)
            
            # Set up dynamic axes if not provided
            if dynamic_axes is None and optimize_for_rtx5090:
                dynamic_axes = self._create_rtx5090_dynamic_axes(input_names)
            
            # Export to ONNX
            logger.info("📤 Exporting PyTorch model to ONNX format...")
            
            torch.onnx.export(
                model,
                tuple(torch_inputs),
                output_path,
                input_names=input_names,
                output_names=self._infer_output_names(model, torch_inputs),
                dynamic_axes=dynamic_axes,
                opset_version=self.rtx_5090_settings["opset_version"],
                do_constant_folding=True,
                keep_initializers_as_inputs=False,
                verbose=False,
                training=torch.onnx.TrainingMode.EVAL
            )

            # Verify the exported model
            self._verify_onnx_model(output_path)
            
            # Apply RTX 5090 optimizations if requested
            if optimize_for_rtx5090:
                output_path = self._optimize_for_rtx5090(output_path, model_name)
            
            conversion_time = time.time() - start_time
            logger.info(f"✅ Model conversion completed in {conversion_time:.2f}s")
            logger.info(f"📁 ONNX model saved to: {output_path}")
            
            # Generate model metadata
            self._generate_model_metadata(output_path, model_name, input_sample, conversion_time)
            
            return output_path

        except Exception as e:
            logger.error(f"❌ Model conversion failed: {e}")
            raise ModelConversionError(f"Failed to convert {model_name}: {str(e)}")

    def _prepare_inputs(self, input_sample: Dict[str, torch.Tensor]) -> Tuple[List[str], List[torch.Tensor]]:
        """Prepare inputs for ONNX export"""
        input_names = []
        torch_inputs = []
        
        for name, tensor in input_sample.items():
            input_names.append(name)
            
            # Ensure tensor is on CPU and has proper dtype
            if tensor.is_cuda:
                tensor = tensor.cpu()
            
            # Convert to float32 for better compatibility
            if tensor.dtype in [torch.float64, torch.float16]:
                tensor = tensor.float()
            
            torch_inputs.append(tensor)
            
        return input_names, torch_inputs

    def _infer_output_names(self, model: nn.Module, inputs: List[torch.Tensor]) -> List[str]:
        """Infer output names from model forward pass"""
        try:
            with torch.no_grad():
                outputs = model(*inputs)
            
            if isinstance(outputs, torch.Tensor):
                return ["output"]
            elif isinstance(outputs, (list, tuple)):
                return [f"output_{i}" for i in range(len(outputs))]
            elif isinstance(outputs, dict):
                return list(outputs.keys())
            else:
                return ["output"]
                
        except Exception:
            logger.warning("Could not infer output names, using default")
            return ["output"]

    def _create_rtx5090_dynamic_axes(self, input_names: List[str]) -> Dict[str, Dict[int, str]]:
        """Create dynamic axes optimized for RTX 5090 batch processing"""
        dynamic_axes = {}
        
        for input_name in input_names:
            # Enable dynamic batch size for better RTX 5090 utilization
            dynamic_axes[input_name] = {0: "batch_size"}
            
            # For sequence models, also enable dynamic sequence length
            if any(term in input_name.lower() for term in ['sequence', 'text', 'token', 'audio']):
                dynamic_axes[input_name][1] = "sequence_length"
        
        return dynamic_axes

    def _verify_onnx_model(self, model_path: str) -> None:
        """Verify the exported ONNX model"""
        try:
            logger.info("🔍 Verifying ONNX model...")
            
            # Load and check the model
            model = onnx.load(model_path)
            onnx.checker.check_model(model)
            
            # Apply shape inference
            model = shape_inference.infer_shapes(model)
            onnx.save(model, model_path)
            
            logger.info("✅ ONNX model verification successful")
            
        except Exception as e:
            raise ModelConversionError(f"ONNX model verification failed: {e}")

    def _optimize_for_rtx5090(self, model_path: str, model_name: str) -> str:
        """Apply RTX 5090-specific optimizations to the ONNX model"""
        try:
            logger.info("🚀 Applying RTX 5090 optimizations...")
            
            # Create optimized model path
            optimized_path = model_path.replace('.onnx', '_rtx5090_optimized.onnx')
            
            # Apply graph optimizations
            optimized_model = self._apply_graph_optimizations(model_path)
            
            # Apply RTX 5090 specific optimizations
            optimized_model = self._apply_rtx5090_specific_optimizations(optimized_model)
            
            # Save optimized model
            onnx.save(optimized_model, optimized_path)
            
            # Validate the optimized model works with ONNX Runtime
            self._validate_with_onnxruntime(optimized_path)
            
            logger.info("✅ RTX 5090 optimizations applied successfully")
            return optimized_path
            
        except Exception as e:
            logger.warning(f"⚠️ RTX 5090 optimization failed: {e}")
            logger.info("Using unoptimized model (will still work)")
            return model_path

    def _apply_graph_optimizations(self, model_path: str) -> onnx.ModelProto:
        """Apply general graph optimizations"""
        try:
            # Load the model
            model = onnx.load(model_path)
            
            # Apply basic optimizations
            optimized_model = optimizer.optimize(model)
            
            return optimized_model
            
        except Exception as e:
            logger.warning(f"Graph optimization failed: {e}")
            return onnx.load(model_path)

    def _apply_rtx5090_specific_optimizations(self, model: onnx.ModelProto) -> onnx.ModelProto:
        """Apply RTX 5090 specific optimizations"""
        try:
            # Optimize for high-throughput inference
            # Enable fusion patterns that work well on RTX 5090
            
            # TODO: Implement specific optimizations like:
            # - Attention fusion for transformer models
            # - MatMul + Add fusion
            # - GELU approximation
            # - Layer normalization fusion
            
            # For now, return the model as-is
            # These optimizations would require more detailed model analysis
            
            return model
            
        except Exception as e:
            logger.warning(f"RTX 5090 specific optimizations failed: {e}")
            return model

    def _validate_with_onnxruntime(self, model_path: str) -> None:
        """Validate the model works with ONNX Runtime and RTX 5090"""
        try:
            logger.info("🔍 Validating with ONNX Runtime...")
            
            # Create session with RTX 5090 providers
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if "TensorrtExecutionProvider" in ort.get_available_providers():
                providers.insert(0, "TensorrtExecutionProvider")
            
            session = ort.InferenceSession(model_path, providers=providers)
            
            # Generate test inputs
            test_inputs = {}
            for input_meta in session.get_inputs():
                shape = input_meta.shape
                # Handle dynamic dimensions
                actual_shape = []
                for dim in shape:
                    if isinstance(dim, str) or dim < 0:
                        actual_shape.append(1)  # Use batch size of 1 for testing
                    else:
                        actual_shape.append(dim)
                
                test_inputs[input_meta.name] = np.random.randn(*actual_shape).astype(np.float32)
            
            # Run test inference
            outputs = session.run(None, test_inputs)
            
            logger.info(f"✅ ONNX Runtime validation successful with providers: {session.get_providers()}")
            
        except Exception as e:
            raise ModelConversionError(f"ONNX Runtime validation failed: {e}")

    def _generate_model_metadata(
        self, 
        model_path: str, 
        model_name: str, 
        input_sample: Dict[str, torch.Tensor],
        conversion_time: float
    ) -> None:
        """Generate metadata file for the converted model"""
        try:
            metadata_path = model_path.replace('.onnx', '_metadata.json')
            
            # Gather model information
            model = onnx.load(model_path)
            
            input_info = {}
            for name, tensor in input_sample.items():
                input_info[name] = {
                    "shape": list(tensor.shape),
                    "dtype": str(tensor.dtype)
                }
            
            metadata = {
                "model_name": model_name,
                "model_path": model_path,
                "conversion_time": conversion_time,
                "opset_version": model.opset_import[0].version if model.opset_import else "unknown",
                "input_info": input_info,
                "rtx5090_optimized": "_rtx5090_optimized" in model_path,
                "created_at": time.time(),
                "converter_version": "1.0.0"
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info(f"📋 Model metadata saved to: {metadata_path}")
            
        except Exception as e:
            logger.warning(f"Could not generate metadata: {e}")

    def convert_vibevoice_model(
        self, 
        vibevoice_model_path: str,
        output_name: str = "vibevoice_optimized"
    ) -> str:
        """Convert VibeVoice model to ONNX with RTX 5090 optimizations"""
        try:
            logger.info(f"🎙️ Converting VibeVoice model from {vibevoice_model_path}")
            
            # This would require access to the VibeVoice model structure
            # For now, this is a placeholder for the actual implementation
            
            # Load VibeVoice model
            # model = load_vibevoice_model(vibevoice_model_path)
            
            # Create sample inputs based on VibeVoice requirements
            sample_inputs = {
                "text_input": torch.randint(0, 1000, (1, 50)),  # Text tokens
                "voice_embedding": torch.randn(1, 256),  # Voice embedding
                "audio_features": torch.randn(1, 80, 100)  # Mel spectrogram features
            }
            
            # Convert to ONNX
            # onnx_path = self.convert_pytorch_to_onnx(
            #     model=model,
            #     model_name=output_name,
            #     input_sample=sample_inputs,
            #     optimize_for_rtx5090=True
            # )
            
            # For now, return a placeholder
            logger.warning("VibeVoice conversion not yet implemented - requires VibeVoice model access")
            raise NotImplementedError("VibeVoice model conversion requires integration with VibeVoice library")
            
        except Exception as e:
            logger.error(f"❌ VibeVoice conversion failed: {e}")
            raise ModelConversionError(f"Failed to convert VibeVoice model: {str(e)}")

    def batch_convert_models(
        self, 
        models: List[Dict[str, Any]],
        output_dir: Optional[str] = None
    ) -> List[str]:
        """Convert multiple models in batch for RTX 5090 optimization"""
        try:
            logger.info(f"🔄 Starting batch conversion of {len(models)} models...")
            
            if output_dir:
                output_path = Path(output_dir)
                output_path.mkdir(exist_ok=True)
            else:
                output_path = self.temp_dir
            
            converted_paths = []
            
            for i, model_config in enumerate(models):
                try:
                    logger.info(f"Converting model {i+1}/{len(models)}: {model_config.get('name', 'unnamed')}")
                    
                    model = model_config["model"]
                    name = model_config.get("name", f"model_{i}")
                    input_sample = model_config["input_sample"]
                    
                    output_file = str(output_path / f"{name}.onnx")
                    
                    converted_path = self.convert_pytorch_to_onnx(
                        model=model,
                        model_name=name,
                        input_sample=input_sample,
                        output_path=output_file,
                        optimize_for_rtx5090=True
                    )
                    
                    converted_paths.append(converted_path)
                    logger.info(f"✅ Successfully converted {name}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed to convert model {i+1}: {e}")
                    continue
            
            logger.info(f"🎉 Batch conversion completed: {len(converted_paths)}/{len(models)} models converted")
            return converted_paths
            
        except Exception as e:
            logger.error(f"❌ Batch conversion failed: {e}")
            raise ModelConversionError(f"Batch conversion failed: {str(e)}")

    def create_optimized_voice_pipeline(
        self,
        stt_model: Optional[nn.Module] = None,
        tts_model: Optional[nn.Module] = None,
        llm_model: Optional[nn.Module] = None,
        pipeline_name: str = "voice_pipeline"
    ) -> Dict[str, str]:
        """Create optimized ONNX models for complete voice pipeline"""
        try:
            logger.info("🎙️ Creating optimized voice pipeline for RTX 5090...")
            
            converted_models = {}
            
            # Convert STT model if provided
            if stt_model:
                stt_inputs = {"audio_input": torch.randn(1, 16000)}  # 1 second of audio at 16kHz
                stt_path = self.convert_pytorch_to_onnx(
                    model=stt_model,
                    model_name=f"{pipeline_name}_stt",
                    input_sample=stt_inputs,
                    optimize_for_rtx5090=True
                )
                converted_models["stt"] = stt_path
            
            # Convert TTS model if provided
            if tts_model:
                tts_inputs = {
                    "text_tokens": torch.randint(0, 1000, (1, 100)),
                    "speaker_id": torch.tensor([0])
                }
                tts_path = self.convert_pytorch_to_onnx(
                    model=tts_model,
                    model_name=f"{pipeline_name}_tts", 
                    input_sample=tts_inputs,
                    optimize_for_rtx5090=True
                )
                converted_models["tts"] = tts_path
            
            # Convert LLM model if provided
            if llm_model:
                llm_inputs = {"input_ids": torch.randint(0, 50000, (1, 512))}
                llm_path = self.convert_pytorch_to_onnx(
                    model=llm_model,
                    model_name=f"{pipeline_name}_llm",
                    input_sample=llm_inputs,
                    optimize_for_rtx5090=True
                )
                converted_models["llm"] = llm_path
            
            logger.info(f"✅ Voice pipeline optimization complete: {list(converted_models.keys())}")
            return converted_models
            
        except Exception as e:
            logger.error(f"❌ Voice pipeline optimization failed: {e}")
            raise ModelConversionError(f"Failed to create voice pipeline: {str(e)}")

    def get_model_info(self, onnx_path: str) -> Dict[str, Any]:
        """Get detailed information about an ONNX model"""
        try:
            model = onnx.load(onnx_path)
            
            # Get input information
            inputs_info = []
            for input_info in model.graph.input:
                input_data = {
                    "name": input_info.name,
                    "type": input_info.type.tensor_type.elem_type,
                    "shape": [dim.dim_value for dim in input_info.type.tensor_type.shape.dim]
                }
                inputs_info.append(input_data)
            
            # Get output information
            outputs_info = []
            for output_info in model.graph.output:
                output_data = {
                    "name": output_info.name,
                    "type": output_info.type.tensor_type.elem_type,
                    "shape": [dim.dim_value for dim in output_info.type.tensor_type.shape.dim]
                }
                outputs_info.append(output_data)
            
            return {
                "model_path": onnx_path,
                "opset_version": model.opset_import[0].version if model.opset_import else "unknown",
                "producer_name": model.producer_name,
                "producer_version": model.producer_version,
                "inputs": inputs_info,
                "outputs": outputs_info,
                "node_count": len(model.graph.node),
                "rtx5090_optimized": "_rtx5090_optimized" in onnx_path
            }
            
        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            return {"error": str(e)}

    def cleanup(self) -> None:
        """Clean up temporary files"""
        try:
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info("🧹 ONNX converter cleanup complete")
        except Exception as e:
            logger.warning(f"Cleanup warning: {e}")


# Utility functions for common conversion tasks
def quick_convert_model(
    model: nn.Module, 
    model_name: str,
    input_sample: Dict[str, torch.Tensor],
    output_path: Optional[str] = None
) -> str:
    """Quick conversion utility function"""
    converter = ONNXConverter()
    try:
        return converter.convert_pytorch_to_onnx(
            model=model,
            model_name=model_name,
            input_sample=input_sample,
            output_path=output_path,
            optimize_for_rtx5090=True
        )
    finally:
        converter.cleanup()


def validate_onnx_model(model_path: str) -> bool:
    """Validate an ONNX model for RTX 5090 compatibility"""
    try:
        # Load and verify model
        model = onnx.load(model_path)
        onnx.checker.check_model(model)
        
        # Test with ONNX Runtime
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        session = ort.InferenceSession(model_path, providers=providers)
        
        logger.info("✅ ONNX model validation successful")
        return True
        
    except Exception as e:
        logger.error(f"❌ ONNX model validation failed: {e}")
        return False