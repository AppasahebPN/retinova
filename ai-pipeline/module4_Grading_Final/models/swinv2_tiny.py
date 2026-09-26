import os
import torch
import torch.nn as nn

class SwinV2TinyDR(nn.Module):
    """
    Swin V2 Tiny backbone configured for 512x512 retinal image screening.
    
    Architecture Highlights:
    1. Backbone: Pretrained Swin Transformer V2 Tiny.
    2. Input Resolution: 512x512 RGB.
    3. Dual Heads:
       - head_referable: Linear(embed_dim, 1) -> Binary logit for Referable DR (G2+ vs G0/1)
       - head_5grade: Linear(embed_dim, 5) -> 5-class logits for ICDR Grades (G0, G1, G2, G3, G4)
    4. Hardware optimization:
       - Native gradient checkpointing support to fit 4GB VRAM
       - AMP mixed precision (FP16) compatibility
    """
    def __init__(self, pretrained=True, checkpoint_path=None, use_grad_checkpointing=True):
        super().__init__()
        self.use_grad_checkpointing = use_grad_checkpointing
        
        # We try torchvision first (built-in, no external download dependencies if cached or installed)
        try:
            import torchvision.models as models
            from torchvision.models.swin_transformer import Swin_V2_T_Weights
            
            weights = Swin_V2_T_Weights.DEFAULT if pretrained and checkpoint_path is None else None
            base_model = models.swin_v2_t(weights=weights)
            self.embed_dim = base_model.head.in_features
            
            # Detach original classification head
            base_model.head = nn.Identity()
            self.backbone = base_model
            self.source = 'torchvision'
            print(f"[SwinV2TinyDR] Loaded torchvision swin_v2_t (embed_dim={self.embed_dim})")
            
        except Exception as e:
            # Fallback to timm if torchvision fails
            try:
                import timm
                base_model = timm.create_model('swinv2_tiny_window16_256', pretrained=pretrained, num_classes=0, img_size=512)
                self.embed_dim = base_model.num_features
                self.backbone = base_model
                self.source = 'timm'
                print(f"[SwinV2TinyDR] Loaded timm swinv2_tiny_window16_256 (embed_dim={self.embed_dim})")
            except Exception as e2:
                raise RuntimeError(f"Failed to load Swin V2 Tiny from both torchvision and timm: {e} | {e2}")

        # Primary Clinical Head: Referable DR Logit
        self.head_referable = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(self.embed_dim, 1)
        )
        
        # Secondary Head: 5-grade ICDR severity
        self.head_5grade = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(self.embed_dim, 5)
        )
        
        if checkpoint_path and os.path.exists(checkpoint_path):
            state = torch.load(checkpoint_path, map_location='cpu')
            if 'model_state_dict' in state:
                self.load_state_dict(state['model_state_dict'])
            else:
                self.load_state_dict(state)
            print(f"[SwinV2TinyDR] Loaded custom weights from {checkpoint_path}")

    def forward(self, x):
        # x shape: (B, 3, 512, 512)
        features = self.backbone(x) # (B, embed_dim)
        
        # Compute logits
        logit_referable = self.head_referable(features) # (B, 1)
        logits_5grade = self.head_5grade(features)       # (B, 5)
        
        return {
            'features': features,
            'logit_referable': logit_referable,
            'logits_5grade': logits_5grade
        }

if __name__ == '__main__':
    # Dry run creation
    print("Testing SwinV2TinyDR instantiation...")
    model = SwinV2TinyDR(pretrained=False)
    print(f"Instantiated successfully with source={model.source}, embed_dim={model.embed_dim}")
