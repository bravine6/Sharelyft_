const supabase = require('../config/supabase');

const driverVerificationController = {
  // Get verification status for current user
  async getVerificationStatus(req, res) {
    try {
      const userId = req.user.id;

      // Check if user is a driver
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.user_type !== 'driver') {
        return res.status(400).json({
          success: false,
          message: 'Only drivers can access verification status'
        });
      }

      // Get all verification documents for this user
      const { data: documents, error: docsError } = await supabase
        .from('driver_verification_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching verification documents:', docsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch verification status'
        });
      }

      // Calculate overall verification status
      const requiredDocTypes = ['license', 'insurance', 'registration'];
      const verifiedDocs = documents.filter(doc => doc.status === 'verified');
      const allRequiredVerified = requiredDocTypes.every(type => 
        verifiedDocs.some(doc => doc.document_type === type)
      );

      res.json({
        success: true,
        data: {
          documents: documents || [],
          overallStatus: allRequiredVerified ? 'verified' : 'pending',
          verifiedCount: verifiedDocs.length,
          totalRequired: requiredDocTypes.length
        }
      });

    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching verification status'
      });
    }
  },

  // Upload verification document
  async uploadDocument(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.body;
      const file = req.file;

      console.log('=== DRIVER DOCUMENT UPLOAD ===');
      console.log('User ID:', userId);
      console.log('Document Type:', type);
      console.log('File:', file ? file.originalname : 'No file');

      // Validate inputs
      if (!type || !file) {
        return res.status(400).json({
          success: false,
          message: 'Document type and file are required'
        });
      }

      const allowedTypes = ['license', 'insurance', 'registration', 'photo'];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type'
        });
      }

      // Check if user is a driver
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (userError || !user || user.user_type !== 'driver') {
        return res.status(400).json({
          success: false,
          message: 'Only drivers can upload verification documents'
        });
      }

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `verification/${userId}/${type}_${Date.now()}.${fileExtension}`;

      // Use the existing user-uploads bucket (same as profile photos)
      const bucketName = 'user-uploads';
      
      // Ensure the storage bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating ${bucketName} bucket...`);
        const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (bucketError) {
          console.error('Failed to create bucket:', bucketError);
          return res.status(500).json({
            success: false,
            message: 'Storage configuration error. Please contact support.'
          });
        }
      }

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file: ' + uploadError.message
        });
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Delete any existing document of the same type for this user
      await supabase
        .from('driver_verification_documents')
        .delete()
        .eq('user_id', userId)
        .eq('document_type', type);

      // Save document record to database
      const { data: docData, error: docError } = await supabase
        .from('driver_verification_documents')
        .insert({
          user_id: userId,
          document_type: type,
          file_name: file.originalname,
          file_path: fileName,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.mimetype,
          status: 'uploaded',
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from(bucketName)
          .remove([fileName]);
        
        return res.status(500).json({
          success: false,
          message: 'Failed to save document record'
        });
      }

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: docData
      });

    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while uploading document'
      });
    }
  },

  // Delete verification document
  async deleteDocument(req, res) {
    try {
      const userId = req.user.id;
      const { documentId } = req.params;

      // Get document details
      const { data: document, error: docError } = await supabase
        .from('driver_verification_documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('user-uploads')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('driver_verification_documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete document'
        });
      }

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });

    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting document'
      });
    }
  },

  // Get pending documents for admin review
  async getPendingDocuments(req, res) {
    try {
      // TODO: Add admin role check
      const { data: documents, error } = await supabase
        .from('driver_verification_documents')
        .select(`
          *,
          user_profiles!inner(
            id,
            first_name,
            email,
            phone
          )
        `)
        .eq('status', 'uploaded')
        .order('uploaded_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending documents:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch pending documents'
        });
      }

      res.json({
        success: true,
        data: documents || []
      });

    } catch (error) {
      console.error('Get pending documents error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching pending documents'
      });
    }
  },

  // Review document (approve/reject)
  async reviewDocument(req, res) {
    try {
      // TODO: Add admin role check
      const { documentId } = req.params;
      const { status, rejectionReason } = req.body;

      if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "verified" or "rejected"'
        });
      }

      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a document'
        });
      }

      const updateData = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: req.user.id
      };

      if (status === 'rejected') {
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('driver_verification_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Document review error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update document status'
        });
      }

      // TODO: Send notification to user about the review result

      res.json({
        success: true,
        message: `Document ${status} successfully`,
        data
      });

    } catch (error) {
      console.error('Review document error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while reviewing document'
      });
    }
  }
};

module.exports = driverVerificationController;