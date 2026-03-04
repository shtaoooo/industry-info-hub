import { describe, it, expect } from 'vitest'
import { PublicSubIndustry } from '../../services/publicService'

describe('IndustryDetail - Tier2/Tier3 Hierarchy', () => {
  describe('Sub-industry filtering', () => {
    it('should separate Tier2 and Tier3 sub-industries correctly', () => {
      const subIndustries: PublicSubIndustry[] = [
        {
          id: 'sub1',
          industryId: 'ind1',
          name: 'Tier2 Group',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier2-Group',
          childrenIds: ['sub3'],
          createdAt: '2024-01-01',
        },
        {
          id: 'sub2',
          industryId: 'ind1',
          name: 'Tier2 Individual',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier2-individual',
          createdAt: '2024-01-01',
        },
        {
          id: 'sub3',
          industryId: 'ind1',
          name: 'Tier3 Child',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier3',
          parentSubIndustryId: 'sub1',
          createdAt: '2024-01-01',
        },
      ]

      const tier2SubIndustries = subIndustries.filter(
        (sub) => sub.level === 'Tier2-Group' || sub.level === 'Tier2-individual' || !sub.level
      )
      const tier3SubIndustries = subIndustries.filter((sub) => sub.level === 'Tier3')

      expect(tier2SubIndustries).toHaveLength(2)
      expect(tier3SubIndustries).toHaveLength(1)
      expect(tier2SubIndustries[0].id).toBe('sub1')
      expect(tier2SubIndustries[1].id).toBe('sub2')
      expect(tier3SubIndustries[0].id).toBe('sub3')
    })

    it('should group Tier3 sub-industries by parent', () => {
      const tier3SubIndustries: PublicSubIndustry[] = [
        {
          id: 'sub3',
          industryId: 'ind1',
          name: 'Tier3 Child 1',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier3',
          parentSubIndustryId: 'sub1',
          createdAt: '2024-01-01',
        },
        {
          id: 'sub4',
          industryId: 'ind1',
          name: 'Tier3 Child 2',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier3',
          parentSubIndustryId: 'sub1',
          createdAt: '2024-01-01',
        },
        {
          id: 'sub5',
          industryId: 'ind1',
          name: 'Tier3 Child 3',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          level: 'Tier3',
          parentSubIndustryId: 'sub2',
          createdAt: '2024-01-01',
        },
      ]

      const tier3ByParent = tier3SubIndustries.reduce((acc, tier3) => {
        if (tier3.parentSubIndustryId) {
          if (!acc[tier3.parentSubIndustryId]) {
            acc[tier3.parentSubIndustryId] = []
          }
          acc[tier3.parentSubIndustryId].push(tier3)
        }
        return acc
      }, {} as Record<string, PublicSubIndustry[]>)

      expect(tier3ByParent['sub1']).toHaveLength(2)
      expect(tier3ByParent['sub2']).toHaveLength(1)
      expect(tier3ByParent['sub1'][0].id).toBe('sub3')
      expect(tier3ByParent['sub1'][1].id).toBe('sub4')
      expect(tier3ByParent['sub2'][0].id).toBe('sub5')
    })

    it('should handle sub-industries without level field as Tier2', () => {
      const subIndustries: PublicSubIndustry[] = [
        {
          id: 'sub1',
          industryId: 'ind1',
          name: 'Legacy Sub-Industry',
          definition: 'Definition',
          definitionCn: '定义',
          typicalGlobalCompanies: [],
          typicalChineseCompanies: [],
          createdAt: '2024-01-01',
        },
      ]

      const tier2SubIndustries = subIndustries.filter(
        (sub) => sub.level === 'Tier2-Group' || sub.level === 'Tier2-individual' || !sub.level
      )

      expect(tier2SubIndustries).toHaveLength(1)
      expect(tier2SubIndustries[0].id).toBe('sub1')
    })
  })

  describe('Expansion state management', () => {
    it('should toggle expansion state correctly', () => {
      const expandedTier2 = new Set<string>()

      // Initially empty
      expect(expandedTier2.has('sub1')).toBe(false)

      // Add to set
      expandedTier2.add('sub1')
      expect(expandedTier2.has('sub1')).toBe(true)

      // Remove from set
      expandedTier2.delete('sub1')
      expect(expandedTier2.has('sub1')).toBe(false)
    })

    it('should handle multiple expanded items', () => {
      const expandedTier2 = new Set<string>(['sub1', 'sub2'])

      expect(expandedTier2.has('sub1')).toBe(true)
      expect(expandedTier2.has('sub2')).toBe(true)
      expect(expandedTier2.has('sub3')).toBe(false)
      expect(expandedTier2.size).toBe(2)
    })
  })
})
