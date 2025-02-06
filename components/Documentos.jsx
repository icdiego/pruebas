// src/components/Documentos.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    TextField,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Link,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DataGrid } from '@mui/x-data-grid';
import useDocumentosStore from '../stores/documentosStore';
import supabase from '../config/supabase';
import UploadModal from './UploadModal';

// Componente para el enlace con URL firmada
const SignedUrlLink = ({ url }) => {
    const [signedUrl, setSignedUrl] = React.useState(null);
    const { getSignedUrl } = useDocumentosStore();
  
    React.useEffect(() => {
      const getUrl = async () => {
        if (!url) return;
        try {
          const fileName = url.split('/').pop();
          const signedUrlResponse = await getSignedUrl(fileName);
          setSignedUrl(signedUrlResponse);
        } catch (error) {
          console.error('Error getting signed URL:', error);
        }
      };
  
      getUrl();
    }, [url, getSignedUrl]);
  
    if (!url) return '-';
    if (!signedUrl) return 'Cargando...';
  
    return (
      <Link 
        href={signedUrl} 
        target="_blank"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        Ver
      </Link>
    );
  };

const Documentos = () => {
    const queryClientInstance = useQueryClient();
    const {
        direccionFilter,
        folioShitFilter,
        showCerrado,
        showCancelado,
        showEnviado,
        showEnProceso,
        setDireccionFilter,
        setFolioShitFilter,
        setShowCerrado,
        setShowCancelado,
        setShowEnviado,
        setShowEnProceso,
        openModal,
        setQueryClient,
      } = useDocumentosStore();

  // Inicializar queryClient en el store
  useEffect(() => {
    setQueryClient(queryClientInstance);
  }, [queryClientInstance, setQueryClient]);

  const fetchDocumentos = async () => {
    try {
      let queryBuilder = supabase
        .from('avaluos')
        .select('id, direccion, folio_shit, folio, escritura, rpp, num_oficial, predial, agua, luz, prueba_edad, ine_comp, rfc_comp, nss, ine_vend, rfc_vend, solicitud, plano, cerrado, cancelado, enviado');

      if (direccionFilter) {
        queryBuilder = queryBuilder.ilike('direccion', `%${direccionFilter}%`);
      }
      if (folioShitFilter) {
        queryBuilder = queryBuilder.ilike('folio_shit', `%${folioShitFilter}%`);
      }

      // Aplicar filtros de estado
      let conditions = [];
      
      if (showEnProceso) {
        conditions.push("cerrado.eq.false");
      }
      if (showCerrado) {
        conditions.push("cerrado.eq.true");
      }
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.or(conditions.join(','));
      }
      
      // Filtro de cancelados siempre se aplica
      if (showCancelado) {
        queryBuilder = queryBuilder.eq('cancelado', true);
      } else {
        queryBuilder = queryBuilder.eq('cancelado', false);
      }
      
      // Filtro de enviados
      if (showEnviado) {
        queryBuilder = queryBuilder.not('enviado', 'is', null);
      }

      queryBuilder = queryBuilder.order('folio_shit', { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error en fetchDocumentos:', error);
      throw error;
    }
  };

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos', direccionFilter, folioShitFilter, showCerrado, showCancelado, showEnviado, showEnProceso],
    queryFn: fetchDocumentos,
    refetchInterval: 30000,
  });

  const handleCellClick = (params, event) => {
    // Ignorar clic en la celda de dirección y folio_shit
    if (['direccion', 'folio_shit', 'nss'].includes(params.field)) {
      return;
    }
    
    event.preventDefault();
    openModal(params.row, params.field);
  };

  const renderLink = (params) => {
    return <SignedUrlLink url={params.value} />;
  };

  const renderBoolean = (params) => {
    if (params.value === null) return '-';
    return params.value ? 'Sí' : 'No';
  };

  const columns = [
    { 
      field: 'direccion',
      headerName: 'Dirección', 
      width: 250,
    },
    { 
      field: 'folio_shit', 
      headerName: 'Folio SHIT', 
      width: 120
    },
    { 
      field: 'escritura', 
      headerName: 'Escritura', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'rpp', 
      headerName: 'RPP', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'num_oficial', 
      headerName: 'Núm. Oficial', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'predial', 
      headerName: 'Predial', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'agua', 
      headerName: 'Agua', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'luz', 
      headerName: 'Luz', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'prueba_edad', 
      headerName: 'Prueba Edad', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'ine_comp', 
      headerName: 'INE Comp', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'rfc_comp', 
      headerName: 'RFC Comp', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'nss', 
      headerName: 'NSS', 
      width: 100,
      renderCell: renderBoolean
    },
    { 
      field: 'ine_vend', 
      headerName: 'INE Vend', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'rfc_vend', 
      headerName: 'RFC Vend', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'solicitud', 
      headerName: 'Solicitud', 
      width: 100,
      renderCell: renderLink
    },
    { 
      field: 'plano', 
      headerName: 'Plano', 
      width: 100,
      renderCell: renderLink
    },
  ];

  return (
    <Box sx={{ height: '100%', width: '100%', p: 2 }}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="filtros-content"
          id="filtros-header"
        >
          <Typography variant="h6">Filtros</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Filtrar por Dirección"
                value={direccionFilter}
                onChange={(e) => setDireccionFilter(e.target.value)}
                fullWidth
              />
              <TextField
                label="Filtrar por Folio SHIT"
                value={folioShitFilter}
                onChange={(e) => setFolioShitFilter(e.target.value)}
                fullWidth
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showEnProceso}
                    onChange={(e) => setShowEnProceso(e.target.checked)}
                  />
                }
                label="En proceso"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCerrado}
                    onChange={(e) => setShowCerrado(e.target.checked)}
                  />
                }
                label="Cerrado"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showCancelado}
                    onChange={(e) => setShowCancelado(e.target.checked)}
                  />
                }
                label="Cancelado"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showEnviado}
                    onChange={(e) => setShowEnviado(e.target.checked)}
                  />
                }
                label="Enviado"
              />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <DataGrid
        rows={documentos}
        columns={columns}
        loading={isLoading}
        autoHeight
        getRowId={(row) => row.id}
        density="compact"
        disableColumnSelector
        disableSelectionOnClick
        onCellClick={handleCellClick}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
          sorting: {
            sortModel: [{ field: 'folio_shit', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
              No hay datos disponibles
            </Box>
          ),
          noResultsOverlay: () => (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
              No se encontraron resultados
            </Box>
          ),
        }}
      />

      <UploadModal />
    </Box>
  );
};

export default Documentos;
