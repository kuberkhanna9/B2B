import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customerId = formData.get('customerId') as string || 'default-customer';
    const returnId = formData.get('returnId') as string || 'default-return';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try Supabase Storage first if configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;
        
        // Supabase Storage Upload API Endpoint:
        // POST/PUT to /storage/v1/object/bucket_name/path_to_file
        const uploadUrl = `${supabaseUrl}/storage/v1/object/return-claims/${customerId}/${returnId}/${fileName}`;
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': file.type || 'image/jpeg'
          },
          body: buffer
        });

        if (response.ok) {
          // Public URL format:
          // https://[project-id].supabase.co/storage/v1/object/public/return-claims/customer-id/return-id/fileName
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/return-claims/${customerId}/${returnId}/${fileName}`;
          return NextResponse.json({ success: true, url: publicUrl });
        } else {
          const errMsg = await response.text();
          console.warn(`Supabase storage upload failed (status: ${response.status}), falling back to local storage. Error: ${errMsg}`);
        }
      } catch (err: any) {
        console.warn('Supabase storage upload threw error, falling back to local storage:', err);
      }
    }

    // Local Storage Fallback
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.name) || '.jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${fileName}`;
    return NextResponse.json({ success: true, url: relativeUrl });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error during upload.' }, { status: 500 });
  }
}
