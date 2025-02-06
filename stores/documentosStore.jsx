// src/stores/documentosStore.js
import { create } from 'zustand';
import supabase from '../config/supabase';

const BUCKET_NAME = 'documentos-avaluos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB en bytes

const useDocumentosStore = create((set, get) => ({
  // Filters
  direccionFilter: '',
  folioShitFilter: '',
  showCerrado: false,
  showCancelado: false,
  showEnviado: false,
  showEnProceso: true, // Por default activado
  
  // Modal state
  isModalOpen: false,
  selectedAvaluo: null,
  selectedDocumentType: '',
  isUploading: false,
  uploadError: null,
  queryClient: null,

  // Inicializar queryClient
  setQueryClient: (client) => set({ queryClient: client }),
  
  // Setters
  setDireccionFilter: (direccion) => set({ direccionFilter: direccion }),
  setFolioShitFilter: (folio) => set({ folioShitFilter: folio }),
  setShowCerrado: (show) => set({ showCerrado: show }),
  setShowCancelado: (show) => set({ showCancelado: show }),
  setShowEnviado: (show) => set({ showEnviado: show }),
  setShowEnProceso: (show) => set({ showEnProceso: show }),
  
  // Modal handlers
  openModal: (avaluo, documentType) => set({ 
    isModalOpen: true, 
    selectedAvaluo: avaluo,
    selectedDocumentType: documentType,
    uploadError: null
  }),
  closeModal: () => set({ 
    isModalOpen: false, 
    selectedAvaluo: null,
    selectedDocumentType: '',
    uploadError: null
  }),

  // URL firmada
  getSignedUrl: async (path) => {
    try {
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600); // URL válida por 1 hora

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  },

  // File upload handler
  uploadDocument: async (file) => {
    const state = get();
    set({ isUploading: true, uploadError: null });

    try {
      // Validar tamaño del archivo
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('El archivo excede el límite de 5MB');
      }

      // Validar tipo de archivo
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido');
      }

      // Obtener el usuario actual y su información de perito
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener información del perito del usuario
      const { data: userData, error: userError } = await supabase
        .from('user_roles')
        .select('perito')
        .eq('user_id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.perito) throw new Error('No se encontró información del perito');

      // Construir el identificador del archivo
      let fileIdentifier;
      if (state.selectedAvaluo.folio_shit) {
        fileIdentifier = state.selectedAvaluo.folio_shit;
      } else {
        fileIdentifier = `${state.selectedAvaluo.folio}_${userData.perito}`;
      }

      // Construir el nombre del archivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${fileIdentifier}_${state.selectedDocumentType}.${fileExtension}`;

      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener la URL firmada del archivo
      const signedUrl = await get().getSignedUrl(fileName);

      // Actualizar el registro en la base de datos
      const { error: updateError } = await supabase
        .from('avaluos')
        .update({ [state.selectedDocumentType]: signedUrl })
        .eq('id', state.selectedAvaluo.id);

      if (updateError) throw updateError;

      // Invalidar la consulta para recargar la tabla
      if (state.queryClient) {
        state.queryClient.invalidateQueries(['documentos']);
      }

      // Cerrar modal si todo fue exitoso
      get().closeModal();

    } catch (error) {
      set({ uploadError: error.message });
    } finally {
      set({ isUploading: false });
    }
  },

  // Reset all filters
  resetFilters: () => set({
    direccionFilter: '',
    folioShitFilter: ''
  })
}));

export default useDocumentosStore;
