import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const generatePVEPdf = async (pveData, flights, dropzones) => {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  
  // Configuration
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const contentWidth = pageWidth - (2 * margin)
  
  // CALCUL: Combien de vols par page (approximatif)
  // Hauteur en-tête: ~50mm
  // Hauteur footer: ~30mm
  // Hauteur disponible 1ère page: ~210mm
  // Hauteur disponible pages suivantes: ~270mm
  // Hauteur moyenne par vol: ~15mm
  // → Page 1: ~14 vols, Pages suivantes: ~18 vols
  
  const VOLS_PER_PAGE_1 = 14
  const VOLS_PER_PAGE_OTHER = 18
  const MIN_PAGES = 2 // Minimum 2 pages de vols
  
  // Calculer combien de lignes vides à ajouter
  const totalFlightsToDisplay = Math.max(
    flights.length,
    VOLS_PER_PAGE_1 + (MIN_PAGES - 1) * VOLS_PER_PAGE_OTHER
  )
  
  let currentY = margin

  // ============================================
  // EN-TÊTE DU DOCUMENT (uniquement page 1)
  // ============================================
  
  // Titre principal
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('PVE REDUIT, ROTATIONS MULTIPLES, MANIFESTE PASSAGERS OU FRÊT', pageWidth / 2, currentY, { align: 'center' })
  currentY += 8

  // Informations principales en 2 colonnes
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  const colWidth = contentWidth / 2
  let leftY = currentY
  let rightY = currentY

  // Colonne gauche
  doc.setFont('helvetica', 'bold')
  doc.text('Date du vol :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(pveData.flight_date).toLocaleDateString('fr-FR'), margin + 25, leftY)
  leftY += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Numéro CRM :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.numero_crm || '', margin + 25, leftY)
  leftY += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Type aéronef :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.type_aeronef || '', margin + 28, leftY)
  leftY += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Immatriculation :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.aircraft_registration || '', margin + 30, leftY)
  leftY += 5

  // Colonne droite
  doc.setFont('helvetica', 'bold')
  doc.text('Configuration aéronef :', margin + colWidth, rightY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(pveData.configuration_aeronef || '', margin + colWidth, rightY + 4)
  rightY += 10
  doc.setFontSize(9)

  doc.setFont('helvetica', 'bold')
  doc.text('Nom, Prénom CDB :', margin + colWidth, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.pilot_name || '', margin + colWidth, rightY + 4)
  rightY += 8

  currentY = Math.max(leftY, rightY) + 3

  // ============================================
  // TABLEAU DES VOLS
  // ============================================
  
  // Préparer les données avec lignes vides
  const tableData = []
  
  for (let i = 0; i < totalFlightsToDisplay; i++) {
    const flight = flights[i]
    
    if (flight) {
      // Vol réel
      const passengersText = flight.passengers && flight.passengers.length > 0
        ? flight.passengers.map(p => `${p.name || ''} (${p.type})`).join('\n')
        : ''

      const hommes = flight.passengers ? flight.passengers.filter(p => p.type === 'H').length : 0
      const femmes = flight.passengers ? flight.passengers.filter(p => p.type === 'F').length : 0
      const enfants = flight.passengers ? flight.passengers.filter(p => p.type === 'E').length : 0
      const hfeText = `${hommes} ${femmes} ${enfants}`

      const dzDepart = dropzones.find(d => d.id === flight.departure_dz_id)
      const dzArrivee = dropzones.find(d => d.id === flight.arrival_dz_id)
      const departText = dzDepart ? `${dzDepart.short_code || dzDepart.oaci_code} ${dzDepart.name}` : ''
      const arriveeText = dzArrivee ? `${dzArrivee.short_code || dzArrivee.oaci_code} ${dzArrivee.name}` : ''

      const heuresText = flight.heure_deco && flight.heure_pose 
        ? `${flight.heure_deco}\n${flight.heure_pose}`
        : ''

      const tempsText = flight.estimated_duration 
        ? `${flight.estimated_duration}min`
        : ''

      const keroText = flight.kerosene_deco && flight.kerosene_pose
        ? `${flight.kerosene_deco}\n${flight.kerosene_pose}`
        : ''

      tableData.push([
        `V: ${i + 1}\nK: ${flight.cas_vol || '-'}\nM: ${flight.bagages_kg || 0}\nT: ${flight.type_mission || ''}`,
        passengersText,
        hfeText,
        `${departText}\n${arriveeText}`,
        heuresText,
        tempsText,
        keroText,
        flight.observations || '',
        flight.attente_heslo || ''
      ])
    } else {
      // Ligne vide
      tableData.push([
        `V: -\nK: -\nM: -\nT: -`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ])
    }
  }

  // Créer le tableau
  autoTable(doc, {
    startY: currentY,
    head: [[
      'V-K-M-T',
      'Noms Pax ou TS',
      'H  F  E',
      'Départ / Arrivée',
      'Heure\nDéco/Posé',
      'Tps Vol\nPrévu/Réel',
      'Kéro\nDéco/Posé',
      'OBS*',
      'Att/Cycle\nHeslo'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      minCellHeight: 12
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 18, fontSize: 6.5 },
      1: { cellWidth: 38, fontSize: 6.5 },
      2: { cellWidth: 12, halign: 'center', fontSize: 7 },
      3: { cellWidth: 36, fontSize: 6.5 },
      4: { cellWidth: 14, halign: 'center', fontSize: 6.5 },
      5: { cellWidth: 14, halign: 'center', fontSize: 6.5 },
      6: { cellWidth: 14, halign: 'center', fontSize: 6.5 },
      7: { cellWidth: 20, fontSize: 6.5 },
      8: { cellWidth: 16, fontSize: 6.5 }
    },
    margin: { left: margin, right: margin },
    // IMPORTANT : Ne pas couper un vol entre 2 pages
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      // Numéro de page en bas
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      )
      
      // Légende en pied de dernière page
      if (data.pageNumber === pageCount) {
        const legendY = pageHeight - 25
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('*OBS :', margin, legendY)
        doc.setFont('helvetica', 'normal')
        doc.text('kéro max et/ou numéro VEMD et/ou cycle moteur ou autre info utile (facultatif)', margin + 10, legendY)
        
        // Signature
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Nom, Prénom et signature du CDB :', margin, legendY + 8)
        doc.line(margin + 60, legendY + 10, margin + 120, legendY + 10)
      }
    }
  })

  // ============================================
  // OUVRIR LE PDF DANS UN NOUVEL ONGLET
  // ============================================
  
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}