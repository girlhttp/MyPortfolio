require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

 
const app = express();
 
app.use(cors());
app.use(express.json());

 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || '123456',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret',
  secure: true
});

 const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'portfolio-projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, crop: 'limit' }],
    public_id: (req, file) => {
      return `project-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    }
  }
});

 const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seules les images sont autorisées.'));
    }
  }
});

 
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté avec succès'))
.catch(err => {
  console.error('❌ Erreur de connexion MongoDB:', err.message);
  console.log('ℹ️ Le serveur fonctionnera avec des données en mémoire temporairement.');
});

// ====================
// MODÈLE PROJECT
// ====================
const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  image: {
    type: String,
    default: 'https://res.cloudinary.com/demo/image/upload/v1612541234/portfolio/default-project.png'
  },
  imagePublicId: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['frontend', 'backend', 'design', 'mobile', 'fullstack'],
    default: 'frontend'
  },
  technologies: {
    type: [String],
    default: []
  },
  githubUrl: {
    type: String,
    default: ''
  },
  liveUrl: {
    type: String,
    default: ''
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

});

//  Creation of Project table With mongoDB
const Project = mongoose.model('Project', projectSchema); // => table name : Project , columns of the table : projectSchema
 
 let tempProjects = [
  {
    _id: '1',
    title: 'Portfolio React',
    description: 'Portfolio moderne développé avec React et Node.js',
    image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    category: 'frontend',
    technologies: ['React', 'Bootstrap', 'CSS3'],
    featured: true
  },
  {
    _id: '2',
    title: 'API REST',
    description: 'API RESTful avec authentification JWT',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    category: 'backend',
    technologies: ['Node.js', 'Express', 'MongoDB'],
    featured: false
  }
];
 
//  1. GET tout les projets
 app.get('/api/projects', async (req, res) => {
  try {
    // Essayer MongoDB d'abord
    if (mongoose.connection.readyState === 1) {
      const projects = await Project.find().sort({ createdAt: -1 });
      return res.json(projects);
    }
     res.json(tempProjects);
  } catch (error) {
    console.error('Erreur GET /projects:', error);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message,
      usingTempData: true,
      projects: tempProjects 
    });
  }
});

// 2. GET un projet par ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
      return res.json(project);
    }
    
     const project = tempProjects.find(p => p._id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST créer un projet (avec image)
app.post('/api/projects', upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, technologies, githubUrl, liveUrl, featured } = req.body;
    
     if (!title || !description) {
      return res.status(400).json({ error: 'Le titre et la description sont requis' });
    }

    let imageUrl = '';
    let imagePublicId = '';

     if (req.file) {
      imageUrl = req.file.path;
      imagePublicId = req.file.filename;
    }

     const projectData = {
      title,
      description,
      category: category || 'frontend',
      technologies: technologies ? technologies.split(',').map(t => t.trim()) : [],
      githubUrl: githubUrl || '',
      liveUrl: liveUrl || '',
      featured: featured === 'true' || featured === true,
      image: imageUrl,
      imagePublicId
    };

     if (mongoose.connection.readyState === 1) {
      const project = new Project(projectData);
      await project.save();
      return res.status(201).json(project);
    }

     const newProject = {
      _id: (tempProjects.length + 1).toString(),
      ...projectData,
      createdAt: new Date()
    };
    tempProjects.push(newProject);
    res.status(201).json(newProject);

  } catch (error) {
    console.error('Erreur POST /projects:', error);
    res.status(400).json({ error: error.message });
  }
});

// 4. PUT modifier un projet
app.put('/api/projects/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    
     if (req.file) {
      updateData.image = req.file.path;
      updateData.imagePublicId = req.file.filename;
      
       if (mongoose.connection.readyState === 1) {
        const oldProject = await Project.findById(req.params.id);
        if (oldProject && oldProject.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(oldProject.imagePublicId);
          } catch (cloudinaryError) {
            console.warn('⚠️ Impossible de supprimer l\'ancienne image:', cloudinaryError);
          }
        }
      }
    }

     if (updateData.technologies && typeof updateData.technologies === 'string') {
      updateData.technologies = updateData.technologies.split(',').map(t => t.trim());
    }

     if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    }

     if (mongoose.connection.readyState === 1) {
      const project = await Project.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );
      if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
      return res.json(project);
    }

     const index = tempProjects.findIndex(p => p._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Projet non trouvé' });
    
    tempProjects[index] = { ...tempProjects[index], ...updateData };
    res.json(tempProjects[index]);

  } catch (error) {
    console.error('Erreur PUT /projects:', error);
    res.status(400).json({ error: error.message });
  }
});

// 5. DELETE supprimer un projet
app.delete('/api/projects/:id', async (req, res) => {
  try {
    // MongoDB
    if (mongoose.connection.readyState === 1) {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet non trouvé' });

      // Supprimer l'image de Cloudinary
      if (project.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(project.imagePublicId);
        } catch (cloudinaryError) {
          console.warn('⚠️ Impossible de supprimer l\'image Cloudinary:', cloudinaryError);
        }
      }

      await Project.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Projet supprimé avec succès' });
    }

     const initialLength = tempProjects.length;
    tempProjects = tempProjects.filter(p => p._id !== req.params.id);
    
    if (tempProjects.length === initialLength) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json({ message: 'Projet supprimé avec succès' });

  } catch (error) {
    console.error('Erreur DELETE /projects:', error);
    res.status(500).json({ error: error.message });
  }
});

 

// 7. Route racine
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Portfolio avec Cloudinary & MongoDB',
    version: '1.0.0',
    endpoints: {
      projects: {
        getAll: 'GET /api/projects',
        getOne: 'GET /api/projects/:id',
        create: 'POST /api/projects',
        update: 'PUT /api/projects/:id',
        delete: 'DELETE /api/projects/:id'
      },
      // health: 'GET /api/health'
    },
    features: [
      'CRUD complet',
      'Upload d\'images avec Cloudinary',
      'Stockage MongoDB',
      'Données temporaires si MongoDB indisponible',
      'CORS activé'
    ]
  });
});

 
app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 5MB)' });
    }
    return res.status(400).json({ error: 'Erreur upload fichier: ' + err.message });
  }
  
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connecté' : '❌ Déconnecté'}`);
  console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configuré' : '⚠️ Non configuré'}`);
  console.log('='.repeat(50));
  console.log('📋 Endpoints disponibles:');
  console.log(`   🌐 Racine: http://localhost:${PORT}`);
  console.log(`   📁 Projets: http://localhost:${PORT}/api/projects`);
  console.log('='.repeat(50));
});