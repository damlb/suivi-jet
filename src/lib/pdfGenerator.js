import jsPDF from 'jspdf'
import 'jspdf-autotable'

export const generatePVEPdf = async (pveData, flights, dropzones) => {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  
  // Configuration
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const contentWidth = pageWidth - (2 * margin)
  
  let currentY = margin

  // ============================================
  // EN-TÊTE DU DOCUMENT
  // ============================================
  
  // Titre principal
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('PVE RÉDUIT, ROTATIONS MULTIPLES, MANIFESTE PASSAGERS OU FRÊT', pageWidth / 2, currentY, { align: 'center' })
  currentY += 10

  // Informations principales en 2 colonnes
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const colWidth = contentWidth / 2
  let leftY = currentY
  let rightY = currentY

  // Colonne gauche
  doc.setFont('helvetica', 'bold')
  doc.text('Date du vol :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(pveData.flight_date).toLocaleDateString('fr-FR'), margin + 30, leftY)
  leftY += 6

  doc.setFont('helvetica', 'bold')
  doc.text('Numéro CRM :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.numero_crm || '-', margin + 30, leftY)
  leftY += 6

  doc.setFont('helvetica', 'bold')
  doc.text('Type aéronef :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.type_aeronef || '-', margin + 30, leftY)
  leftY += 6

  doc.setFont('helvetica', 'bold')
  doc.text('Immatriculation :', margin, leftY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.aircraft_registration || '-', margin + 30, leftY)
  leftY += 6

  // Colonne droite
  doc.setFont('helvetica', 'bold')
  doc.text('Configuration aéronef :', margin + colWidth, rightY)
  doc.setFont('helvetica', 'normal')
  const configLines = doc.splitTextToSize(pveData.configuration_aeronef || '-', colWidth - 45)
  doc.text(configLines, margin + colWidth, rightY + 5)
  rightY += 6 * configLines.length

  doc.setFont('helvetica', 'bold')
  doc.text('Nom, Prénom CDB :', margin + colWidth, rightY)
  doc.setFont('helvetica', 'normal')
  doc.text(pveData.pilot_name || '-', margin + colWidth, rightY + 5)
  rightY += 10

  currentY = Math.max(leftY, rightY) + 5

  // ============================================
  // TABLEAU DES VOLS
  // ============================================
  
  if (flights.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('Aucun vol enregistré', pageWidth / 2, currentY, { align: 'center' })
  } else {
    // Préparer les données du tableau
    const tableData = flights.map((flight, idx) => {
      // Formater les passagers
      const passengersText = flight.passengers && flight.passengers.length > 0
        ? flight.passengers.map(p => `${p.name || '-'} (${p.type})`).join('\n')
        : '-'

      // Compter H/F/E
      const hommes = flight.passengers ? flight.passengers.filter(p => p.type === 'H').length : 0
      const femmes = flight.passengers ? flight.passengers.filter(p => p.type === 'F').length : 0
      const enfants = flight.passengers ? flight.passengers.filter(p => p.type === 'E').length : 0
      const hfeText = `${hommes}/${femmes}/${enfants}`

      // Départ / Arrivée
      const dzDepart = dropzones.find(d => d.id === flight.departure_dz_id)
      const dzArrivee = dropzones.find(d => d.id === flight.arrival_dz_id)
      const departText = dzDepart ? `${dzDepart.short_code || dzDepart.oaci_code}\n${dzDepart.name}` : '-'
      const arriveeText = dzArrivee ? `${dzArrivee.short_code || dzArrivee.oaci_code}\n${dzArrivee.name}` : '-'

      // Heures
      const heuresText = flight.heure_deco && flight.heure_pose 
        ? `${flight.heure_deco} / ${flight.heure_pose}`
        : '-'

      // Temps vol
      const tempsText = flight.estimated_duration 
        ? `${flight.estimated_duration} min`
        : '-'

      // Kérosène
      const keroText = flight.kerosene_deco && flight.kerosene_pose
        ? `${flight.kerosene_deco} / ${flight.kerosene_pose}`
        : '-'

      return [
        `V: ${idx + 1}\nK: ${flight.cas_vol || '-'}\nM: ${flight.bagages_kg || 0}kg\nT: ${flight.type_mission || '-'}`,
        passengersText,
        hfeText,
        `${departText}\n→\n${arriveeText}`,
        heuresText,
        tempsText,
        keroText,
        flight.observations || '-',
        flight.attente_heslo || '-'
      ]
    })

    // Créer le tableau
    doc.autoTable({
      startY: currentY,
      head: [[
        'V-K-M-T',
        'Noms Pax',
        'H/F/E',
        'Départ / Arrivée',
        'Heure\nDéco/Posé',
        'Tps Vol\nPrévu',
        'Kéro\nDéco/Posé',
        'OBS*',
        'Att/Cycle\nHeslo'
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 18, fontSize: 7 },
        1: { cellWidth: 35, fontSize: 7 },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 35, fontSize: 7 },
        4: { cellWidth: 18, halign: 'center', fontSize: 7 },
        5: { cellWidth: 15, halign: 'center', fontSize: 7 },
        6: { cellWidth: 18, halign: 'center', fontSize: 7 },
        7: { cellWidth: 20, fontSize: 7 },
        8: { cellWidth: 18, fontSize: 7 }
      },
      margin: { left: margin, right: margin },
      // IMPORTANT : Ne pas couper un vol entre 2 pages
      rowPageBreak: 'avoid',
      didDrawPage: (data) => {
        // Ajouter numéro de page en bas
        const pageCount = doc.internal.getNumberOfPages()
        doc.setFontSize(8)
        doc.text(
          `Page ${data.pageNumber} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        )
      }
    })

    currentY = doc.lastAutoTable.finalY + 5
  }

  // ============================================
  // LÉGENDE ET SIGNATURES
  // ============================================
  
  // Vérifier s'il reste assez d'espace, sinon nouvelle page
  if (currentY > pageHeight - 40) {
    doc.addPage()
    currentY = margin
  }

  currentY += 5

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Légende :', margin, currentY)
  currentY += 4
  doc.setFont('helvetica', 'normal')
  doc.text('V = N° vol  |  K = Cas de vol  |  M = Masse bagages  |  T = Type mission (TP/MEP)', margin, currentY)
  currentY += 4
  doc.text('H = Homme  |  F = Femme  |  E = Enfant', margin, currentY)
  currentY += 8

  // Signature
  doc.setFont('helvetica', 'bold')
  doc.text('Signature du Commandant de Bord :', margin, currentY)
  currentY += 15
  doc.line(margin, currentY, margin + 60, currentY)

  // ============================================
  // OUVRIR LE PDF DANS UN NOUVEL ONGLET
  // ============================================
  
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}